using JobTracker.Api.Data;
using JobTracker.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace JobTracker.Api.Services;

public sealed class ScheduleReminderWorker(
    IServiceScopeFactory scopeFactory,
    IOptions<EmailOptions> emailOptions,
    IOptions<ScheduleReminderOptions> reminderOptions,
    ILogger<ScheduleReminderWorker> logger) : BackgroundService
{
    private readonly EmailOptions _emailOptions = emailOptions.Value;
    private readonly ScheduleReminderOptions _reminderOptions = reminderOptions.Value;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (string.IsNullOrWhiteSpace(_emailOptions.ApiKey))
        {
            logger.LogInformation("Schedule email reminders are disabled because Email:ApiKey is not configured.");
            return;
        }

        var pollInterval = TimeSpan.FromMinutes(Math.Clamp(_reminderOptions.PollIntervalMinutes, 1, 60));
        using var timer = new PeriodicTimer(pollInterval);

        do
        {
            try
            {
                await SendDueReminders(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "The schedule reminder scan failed.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task SendDueReminders(CancellationToken cancellationToken)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var emailSender = scope.ServiceProvider.GetRequiredService<ResendEmailSender>();
        var now = DateTimeOffset.UtcNow;
        var reminderCutoff = now.AddHours(Math.Clamp(_reminderOptions.LookaheadHours, 1, 168));

        var dueEventIds = await context.ApplicationEvents
            .AsNoTracking()
            .Where(applicationEvent =>
                applicationEvent.Status == ApplicationEventStatus.Scheduled &&
                applicationEvent.ReminderSentAtUtc == null &&
                applicationEvent.StartsAt > now &&
                applicationEvent.StartsAt <= reminderCutoff &&
                applicationEvent.Application.User.DisabledAtUtc == null &&
                applicationEvent.Application.User.EmailConfirmed &&
                applicationEvent.Application.User.Email != null)
            .OrderBy(applicationEvent => applicationEvent.StartsAt)
            .Select(applicationEvent => applicationEvent.Id)
            .Take(100)
            .ToListAsync(cancellationToken);

        foreach (var eventId in dueEventIds)
        {
            var applicationEvent = await context.ApplicationEvents
                .Include(item => item.Application)
                .ThenInclude(application => application.User)
                .SingleOrDefaultAsync(item =>
                    item.Id == eventId &&
                    item.Status == ApplicationEventStatus.Scheduled &&
                    item.ReminderSentAtUtc == null,
                    cancellationToken);

            if (applicationEvent?.Application.User.Email is not { Length: > 0 } recipient)
            {
                continue;
            }

            try
            {
                await emailSender.SendScheduleReminderAsync(
                    recipient,
                    applicationEvent,
                    cancellationToken);
                applicationEvent.ReminderSentAtUtc = DateTimeOffset.UtcNow;
                await context.SaveChangesAsync(cancellationToken);
                logger.LogInformation(
                    "Sent schedule reminder for event {EventId} starting at {StartsAt}.",
                    applicationEvent.Id,
                    applicationEvent.StartsAt);
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                logger.LogError(exception, "Unable to send schedule reminder for event {EventId}.", eventId);
                context.ChangeTracker.Clear();
            }
        }
    }
}

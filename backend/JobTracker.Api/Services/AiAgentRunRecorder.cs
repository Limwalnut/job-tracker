using JobTracker.Api.Data;
using JobTracker.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Data;

namespace JobTracker.Api.Services;

public sealed class AiAgentRunRecorder(
    AppDbContext context,
    IOptions<AiAgentQuotaOptions> quotaOptions)
{
    private const long AdvisoryLockSeed = 8675309;

    public async Task<AiAgentRun> StartAsync(
        string userId,
        string model,
        CancellationToken cancellationToken)
    {
        var dailyRunLimit = quotaOptions.Value.DailyRunLimit;
        await using var transaction = await context.Database
            .BeginTransactionAsync(IsolationLevel.ReadCommitted, cancellationToken);

        await context.Database.ExecuteSqlInterpolatedAsync(
            $"SELECT pg_advisory_xact_lock(hashtextextended({userId}, {AdvisoryLockSeed}))",
            cancellationToken);

        var now = DateTimeOffset.UtcNow;
        var dayStartUtc = new DateTimeOffset(now.UtcDateTime.Date, TimeSpan.Zero);
        var resetAtUtc = dayStartUtc.AddDays(1);
        var runsToday = await context.AiAgentRuns.CountAsync(
            run => run.UserId == userId &&
                run.StartedAtUtc >= dayStartUtc &&
                run.StartedAtUtc < resetAtUtc,
            cancellationToken);

        if (runsToday >= dailyRunLimit)
        {
            throw new AiAgentQuotaExceededException(
                dailyRunLimit,
                resetAtUtc);
        }

        var run = new AiAgentRun
        {
            UserId = userId,
            Model = model,
            StartedAtUtc = now
        };

        context.AiAgentRuns.Add(run);
        await context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return run;
    }

    public async Task SaveProgressAsync(
        AiAgentRun run,
        int modelCalls,
        int toolExecutions,
        int inputTokens,
        int outputTokens,
        CancellationToken cancellationToken)
    {
        run.ModelCalls = modelCalls;
        run.ToolExecutions = toolExecutions;
        run.InputTokens = inputTokens;
        run.OutputTokens = outputTokens;

        await context.SaveChangesAsync(cancellationToken);
    }

    public async Task FinishAsync(
        AiAgentRun run,
        string status,
        string stopReason,
        CancellationToken cancellationToken)
    {
        if (status is not ("completed" or "stopped" or "failed"))
        {
            throw new ArgumentException(
                "Invalid terminal run status.", nameof(status));
        }

        run.Status = status;
        run.StopReason = stopReason;
        run.FinishedAtUtc = DateTimeOffset.UtcNow;

        await context.SaveChangesAsync(cancellationToken);
    }
}

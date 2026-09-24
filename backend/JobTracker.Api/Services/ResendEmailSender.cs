using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Encodings.Web;
using JobTracker.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace JobTracker.Api.Services;

public sealed class ResendEmailSender(
    HttpClient httpClient,
    IOptions<EmailOptions> options,
    ILogger<ResendEmailSender> logger) : IEmailSender<ApplicationUser>
{
    private readonly EmailOptions _options = options.Value;

    public Task SendConfirmationLinkAsync(
        ApplicationUser user,
        string email,
        string confirmationLink)
    {
        return SendActionEmailAsync(
            email,
            "Confirm your Applyline email",
            "Confirm email",
            "Confirm your email address to finish setting up your Applyline account.",
            confirmationLink);
    }

    public Task SendPasswordResetLinkAsync(
        ApplicationUser user,
        string email,
        string resetLink)
    {
        return SendActionEmailAsync(
            email,
            "Reset your Applyline password",
            "Reset password",
            "We received a request to reset your Applyline password.",
            resetLink);
    }

    public Task SendPasswordResetCodeAsync(
        ApplicationUser user,
        string email,
        string resetCode)
    {
        var resetUrl = BuildFrontendUrl("/reset-password", new Dictionary<string, string>
        {
            ["email"] = email,
            ["code"] = resetCode
        });

        return SendActionEmailAsync(
            email,
            "Reset your Applyline password",
            "Reset password",
            "We received a request to reset your Applyline password.",
            resetUrl);
    }

    public async Task SendScheduleReminderAsync(
        string recipient,
        ApplicationEvent applicationEvent,
        CancellationToken cancellationToken = default)
    {
        EnsureConfigured();

        var eventTime = FormatEventTime(applicationEvent);
        var applicationUrl = BuildFrontendUrl($"/applications/{applicationEvent.ApplicationId}");
        var eventLabel = applicationEvent.Type switch
        {
            ApplicationEventType.Interview when applicationEvent.InterviewRound.HasValue =>
                $"Interview {applicationEvent.InterviewRound.Value}",
            ApplicationEventType.FollowUp => "Follow-up",
            _ => applicationEvent.Type.ToString()
        };
        var subject = $"Reminder: upcoming {eventLabel} with {applicationEvent.Application.CompanyName}";
        var encodedEventLabel = HtmlEncoder.Default.Encode(eventLabel);
        var encodedTitle = HtmlEncoder.Default.Encode(applicationEvent.Title);
        var encodedCompany = HtmlEncoder.Default.Encode(applicationEvent.Application.CompanyName);
        var encodedJobTitle = HtmlEncoder.Default.Encode(applicationEvent.Application.JobTitle);
        var encodedEventTime = HtmlEncoder.Default.Encode(eventTime);
        var encodedApplicationUrl = HtmlEncoder.Default.Encode(applicationUrl);
        var encodedLocation = string.IsNullOrWhiteSpace(applicationEvent.LocationOrLink)
            ? null
            : HtmlEncoder.Default.Encode(applicationEvent.LocationOrLink);

        var locationHtml = encodedLocation is null
            ? string.Empty
            : $"<p style=\"margin:8px 0 0;color:#58627d;line-height:1.6\"><strong>Location:</strong> {encodedLocation}</p>";
        var locationText = string.IsNullOrWhiteSpace(applicationEvent.LocationOrLink)
            ? string.Empty
            : $"\nLocation: {applicationEvent.LocationOrLink}";

        using var request = CreateEmailRequest(
            recipient,
            subject,
            $$"""
                <!doctype html>
                <html lang="en">
                  <body style="margin:0;background:#f4f5fa;color:#17205d;font-family:Arial,sans-serif">
                    <div style="max-width:560px;margin:0 auto;padding:40px 20px">
                      <div style="background:#fff;border:1px solid #dce1ef;padding:36px">
                        <p style="margin:0 0 24px;color:#4036c9;font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">Applyline reminder</p>
                        <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2">{{encodedEventLabel}} coming up</h1>
                        <p style="margin:0 0 24px;color:#58627d;line-height:1.6">Your scheduled next step for <strong>{{encodedJobTitle}}</strong> at <strong>{{encodedCompany}}</strong> starts within 24 hours.</p>
                        <div style="margin:0 0 26px;padding:18px;background:#f7f7fc;border-left:4px solid #4f46e5">
                          <p style="margin:0 0 8px;font-weight:700">{{encodedTitle}}</p>
                          <p style="margin:0;color:#58627d;line-height:1.6"><strong>When:</strong> {{encodedEventTime}}</p>
                          {{locationHtml}}
                        </div>
                        <a href="{{encodedApplicationUrl}}" style="display:inline-block;padding:13px 20px;background:#202b78;color:#fff;text-decoration:none;font-weight:700">View application</a>
                        <p style="margin:28px 0 0;color:#79829a;font-size:12px;line-height:1.5">You are receiving this email because this event is scheduled in your Applyline account.</p>
                      </div>
                    </div>
                  </body>
                </html>
                """,
            $"{eventLabel} coming up\n\n{applicationEvent.Title}\n{applicationEvent.Application.JobTitle} at {applicationEvent.Application.CompanyName}\nWhen: {eventTime}{locationText}\n\nView application: {applicationUrl}");

        await SendRequestAsync(request, "schedule reminder", cancellationToken);
    }

    private async Task SendActionEmailAsync(
        string recipient,
        string subject,
        string actionLabel,
        string introduction,
        string actionUrl)
    {
        EnsureConfigured();

        var encodedActionUrl = HtmlEncoder.Default.Encode(actionUrl);
        var encodedIntroduction = HtmlEncoder.Default.Encode(introduction);
        var encodedActionLabel = HtmlEncoder.Default.Encode(actionLabel);

        using var request = CreateEmailRequest(
            recipient,
            subject,
            $$"""
                <!doctype html>
                <html lang="en">
                  <body style="margin:0;background:#f4f5fa;color:#17205d;font-family:Arial,sans-serif">
                    <div style="max-width:560px;margin:0 auto;padding:40px 20px">
                      <div style="background:#fff;border:1px solid #dce1ef;padding:36px">
                        <p style="margin:0 0 24px;color:#4036c9;font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">Applyline</p>
                        <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2">{{encodedActionLabel}}</h1>
                        <p style="margin:0 0 26px;color:#58627d;line-height:1.6">{{encodedIntroduction}}</p>
                        <a href="{{encodedActionUrl}}" style="display:inline-block;padding:13px 20px;background:#202b78;color:#fff;text-decoration:none;font-weight:700">{{encodedActionLabel}}</a>
                        <p style="margin:28px 0 8px;color:#79829a;font-size:13px;line-height:1.5">This link expires in one hour. If you did not make this request, you can safely ignore this email.</p>
                        <p style="margin:0;color:#79829a;font-size:12px;word-break:break-all">{{encodedActionUrl}}</p>
                      </div>
                    </div>
                  </body>
                </html>
                """,
            $"{introduction}\n\n{actionLabel}: {actionUrl}\n\nThis link expires in one hour. If you did not make this request, you can safely ignore this email.");

        await SendRequestAsync(request, "identity email", CancellationToken.None);
    }

    private HttpRequestMessage CreateEmailRequest(
        string recipient,
        string subject,
        string html,
        string text)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "emails");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);
        request.Content = JsonContent.Create(new
        {
            from = $"{_options.FromName} <{_options.FromAddress}>",
            to = new[] { recipient },
            subject,
            html,
            text
        });
        return request;
    }

    private async Task SendRequestAsync(
        HttpRequestMessage request,
        string emailKind,
        CancellationToken cancellationToken)
    {
        using var response = await httpClient.SendAsync(request, cancellationToken);

        if (response.IsSuccessStatusCode)
        {
            return;
        }

        var responseBody = await response.Content.ReadAsStringAsync();
        logger.LogError(
            "Resend rejected a {EmailKind} with status {StatusCode}: {ResponseBody}",
            emailKind,
            (int)response.StatusCode,
            responseBody);
        throw new HttpRequestException(
            $"The email provider rejected the request with status {(int)response.StatusCode}.");
    }

    private void EnsureConfigured()
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            throw new InvalidOperationException(
                "Email:ApiKey is not configured. Add the Resend API key to the runtime environment.");
        }
    }

    private static string FormatEventTime(ApplicationEvent applicationEvent)
    {
        var timeZone = TimeZoneInfo.FindSystemTimeZoneById(applicationEvent.TimeZone);
        var localStart = TimeZoneInfo.ConvertTime(applicationEvent.StartsAt, timeZone);
        return applicationEvent.IsAllDay
            ? $"{localStart:ddd, dd MMM yyyy} (all day)"
            : $"{localStart:ddd, dd MMM yyyy 'at' h:mm tt} ({applicationEvent.TimeZone})";
    }

    private string BuildFrontendUrl(string path, IReadOnlyDictionary<string, string> query)
    {
        if (!Uri.TryCreate(_options.FrontendBaseUrl, UriKind.Absolute, out var baseUri))
        {
            throw new InvalidOperationException("Email:FrontendBaseUrl must be an absolute URL.");
        }

        var queryString = string.Join(
            "&",
            query.Select(pair =>
                $"{Uri.EscapeDataString(pair.Key)}={Uri.EscapeDataString(pair.Value)}"));
        return new Uri(baseUri, $"{path}?{queryString}").ToString();
    }

    private string BuildFrontendUrl(string path)
    {
        if (!Uri.TryCreate(_options.FrontendBaseUrl, UriKind.Absolute, out var baseUri))
        {
            throw new InvalidOperationException("Email:FrontendBaseUrl must be an absolute URL.");
        }

        return new Uri(baseUri, path).ToString();
    }
}

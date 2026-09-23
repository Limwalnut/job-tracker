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

    private async Task SendActionEmailAsync(
        string recipient,
        string subject,
        string actionLabel,
        string introduction,
        string actionUrl)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            throw new InvalidOperationException(
                "Email:ApiKey is not configured. Add the Resend API key to the runtime environment.");
        }

        var encodedActionUrl = HtmlEncoder.Default.Encode(actionUrl);
        var encodedIntroduction = HtmlEncoder.Default.Encode(introduction);
        var encodedActionLabel = HtmlEncoder.Default.Encode(actionLabel);

        using var request = new HttpRequestMessage(HttpMethod.Post, "emails");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);
        request.Content = JsonContent.Create(new
        {
            from = $"{_options.FromName} <{_options.FromAddress}>",
            to = new[] { recipient },
            subject,
            html = $$"""
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
            text = $"{introduction}\n\n{actionLabel}: {actionUrl}\n\nThis link expires in one hour. If you did not make this request, you can safely ignore this email."
        });

        using var response = await httpClient.SendAsync(request);
        if (response.IsSuccessStatusCode)
        {
            return;
        }

        var responseBody = await response.Content.ReadAsStringAsync();
        logger.LogError(
            "Resend rejected an identity email with status {StatusCode}: {ResponseBody}",
            (int)response.StatusCode,
            responseBody);
        throw new HttpRequestException(
            $"The email provider rejected the request with status {(int)response.StatusCode}.");
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
}

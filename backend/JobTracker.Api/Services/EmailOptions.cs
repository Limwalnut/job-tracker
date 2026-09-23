namespace JobTracker.Api.Services;

public sealed class EmailOptions
{
    public const string SectionName = "Email";

    public string ApiKey { get; init; } = string.Empty;
    public string FromAddress { get; init; } = "no-reply@mail.applyline.app";
    public string FromName { get; init; } = "Applyline";
    public string FrontendBaseUrl { get; init; } = "https://applyline.app";
}

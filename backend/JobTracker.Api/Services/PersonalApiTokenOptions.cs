using System.ComponentModel.DataAnnotations;

namespace JobTracker.Api.Services;

public sealed class PersonalApiTokenOptions
{
    public const string SectionName = "PersonalApiTokens";

    [Range(1, 100)]
    public int MaxActiveTokens { get; set; } = 10;

    [Range(1, 10000)]
    public int RequestsPerMinute { get; set; } = 120;
}

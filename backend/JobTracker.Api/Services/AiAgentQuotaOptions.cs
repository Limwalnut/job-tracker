using System.ComponentModel.DataAnnotations;

namespace JobTracker.Api.Services;

public sealed class AiAgentQuotaOptions
{
    public const string SectionName = "AiAgentQuota";

    [Range(1, int.MaxValue)]
    public int DailyRunLimit { get; set; } = 5;
}

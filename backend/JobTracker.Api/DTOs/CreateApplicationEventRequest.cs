using System.ComponentModel.DataAnnotations;
using JobTracker.Api.Models;

namespace JobTracker.Api.DTOs;

public class CreateApplicationEventRequest : IValidatableObject
{
    [Required]
    [StringLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [EnumDataType(typeof(ApplicationEventType))]
    public ApplicationEventType? Type { get; set; }

    [Required]
    public DateTimeOffset? StartsAt { get; set; }

    [Required]
    public DateTimeOffset? EndsAt { get; set; }

    [Required]
    [StringLength(100)]
    public string TimeZone { get; set; } = string.Empty;

    [StringLength(2000)]
    public string? LocationOrLink { get; set; }

    [StringLength(4000)]
    public string? Notes { get; set; }

    public bool UpdateApplicationStatus { get; set; }

    public IEnumerable<ValidationResult> Validate(
        ValidationContext validationContext)
    {
        if (!string.IsNullOrWhiteSpace(TimeZone))
        {
            TimeZoneInfo? zone = null;
            try { zone = TimeZoneInfo.FindSystemTimeZoneById(TimeZone.Trim()); }
            catch (TimeZoneNotFoundException) { }
            catch (InvalidTimeZoneException) { }

            if (zone is null)
                yield return new ValidationResult("Select a valid time zone.", new[] { nameof(TimeZone) });
            else
            {
                foreach (var entry in new[] { (nameof(StartsAt), StartsAt), (nameof(EndsAt), EndsAt) })
                {
                    if (entry.Item2 is DateTimeOffset instant &&
                        zone.GetUtcOffset(instant) != instant.Offset)
                        yield return new ValidationResult(
                            "The time offset does not match the selected time zone.",
                            new[] { entry.Item1 });
                }
            }
        }

        if (StartsAt.HasValue &&
            EndsAt.HasValue &&
            EndsAt.Value <= StartsAt.Value)
        {
            yield return new ValidationResult(
                "End time must be later than start time.",
                new[] { nameof(EndsAt) });
        }
    }
}
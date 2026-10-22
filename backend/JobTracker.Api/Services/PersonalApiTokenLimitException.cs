namespace JobTracker.Api.Services;

public sealed class PersonalApiTokenLimitException(int maximum) : Exception
{
    public int Maximum { get; } = maximum;
}

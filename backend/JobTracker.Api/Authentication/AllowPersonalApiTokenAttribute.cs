namespace JobTracker.Api.Authentication;

[AttributeUsage(AttributeTargets.Method, AllowMultiple = false, Inherited = true)]
public sealed class AllowPersonalApiTokenAttribute : Attribute
{
}

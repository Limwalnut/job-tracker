using JobTracker.Api.Data;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;
using JobTracker.Api.Models;
using Microsoft.AspNetCore.Identity;
using System.Security.Claims;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.AspNetCore.HttpOverrides;
using JobTracker.Api.Authentication;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(
            new JsonStringEnumConverter<ApplicationStatus>(
                namingPolicy: null,
                allowIntegerValues: false));

        options.JsonSerializerOptions.Converters.Add(
            new JsonStringEnumConverter<ApplicationEventType>(
                namingPolicy: null,
                allowIntegerValues: false));

        options.JsonSerializerOptions.Converters.Add(
            new JsonStringEnumConverter<ApplicationEventStatus>(
                namingPolicy: null,
                allowIntegerValues: false));

        options.JsonSerializerOptions.Converters.Add(
            new JsonStringEnumConverter<ApplicationStatusChangeSource>(
                namingPolicy: null,
                allowIntegerValues: false));
    });
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var connectionString =
    builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "Connection string 'DefaultConnection' was not found.");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddDataProtection()
    .SetApplicationName("Applyline")
    .PersistKeysToDbContext<AppDbContext>();

builder.Services
    .AddIdentityApiEndpoints<ApplicationUser>()
    .AddEntityFrameworkStores<AppDbContext>();

var googleClientId = builder.Configuration["Authentication:Google:ClientId"];
var googleClientSecret = builder.Configuration["Authentication:Google:ClientSecret"];
var googleAuthenticationEnabled =
    !string.IsNullOrWhiteSpace(googleClientId) &&
    !string.IsNullOrWhiteSpace(googleClientSecret);

if (googleAuthenticationEnabled)
{
    builder.Services.AddAuthentication()
        .AddGoogle(options =>
        {
            options.ClientId = googleClientId!;
            options.ClientSecret = googleClientSecret!;
            options.SignInScheme = IdentityConstants.ExternalScheme;
            options.Events.OnRemoteFailure = context =>
            {
                context.HandleResponse();
                context.Response.Redirect(
                    GoogleAuthenticationEndpoints.CreateFrontendUrl(
                        context.HttpContext,
                        builder.Configuration["Authentication:FrontendBaseUrl"],
                        "/login?googleError=authentication_failed"));
                return Task.CompletedTask;
            };
        });
}

builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.Name = "Applyline.Auth";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Lax;

    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.SameAsRequest
        : CookieSecurePolicy.Always;

    options.ExpireTimeSpan = TimeSpan.FromDays(7);
    options.SlidingExpiration = true;
});

builder.Services.AddAuthorization();

var app = builder.Build();

var forwardedHeadersOptions = new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
};
forwardedHeadersOptions.KnownIPNetworks.Clear();
forwardedHeadersOptions.KnownProxies.Clear();
app.UseForwardedHeaders(forwardedHeadersOptions);

app.Use(async (context, next) =>
{
    var path = context.Request.Path;
    var shouldPreventIndexing =
        path.StartsWithSegments("/api") ||
        path.StartsWithSegments("/health") ||
        path.StartsWithSegments("/login") ||
        path.StartsWithSegments("/register") ||
        path.StartsWithSegments("/applications");

    if (shouldPreventIndexing)
    {
        context.Response.OnStarting(() =>
        {
            context.Response.Headers["X-Robots-Tag"] = "noindex, nofollow";
            return Task.CompletedTask;
        });
    }

    await next();
});

if (!app.Environment.IsDevelopment())
{
    await using var scope = app.Services.CreateAsyncScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await dbContext.Database.MigrateAsync();
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

if (app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

if (!app.Environment.IsDevelopment())
{
    app.UseDefaultFiles();
    app.UseStaticFiles();
}

app.UseAuthentication();

app.UseAuthorization();
var auth = app.MapGroup("/api/auth");

auth.MapIdentityApi<ApplicationUser>();

auth.MapGoogleAuthentication(
    googleAuthenticationEnabled,
    builder.Configuration["Authentication:FrontendBaseUrl"]);

auth.MapGet("/me", (ClaimsPrincipal principal) =>
{
    return Results.Ok(new
    {
        id = principal.FindFirstValue(ClaimTypes.NameIdentifier),
        email = principal.FindFirstValue(ClaimTypes.Email)
    });
}).RequireAuthorization();

auth.MapPost("/logout", async (
    SignInManager<ApplicationUser> signInManager) =>
{
    await signInManager.SignOutAsync();
    return Results.NoContent();
}).RequireAuthorization();

app.MapControllers();

app.MapGet("/health", () => Results.Ok(new
{
    status = "healthy"
}));

if (!app.Environment.IsDevelopment())
{
    app.MapFallbackToFile("index.html");
}

app.Run();

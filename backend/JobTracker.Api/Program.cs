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
using JobTracker.Api.Services;
using System.Threading.RateLimiting;
using OpenAI.Responses;
using System.Text.Json;

#pragma warning disable OPENAI001

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
            new JsonStringEnumConverter<InterviewOutcome>(
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
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<AppDbContext>();

builder.Services.Configure<DataProtectionTokenProviderOptions>(options =>
{
    options.TokenLifespan = TimeSpan.FromHours(1);
});

builder.Services.Configure<EmailOptions>(
    builder.Configuration.GetSection(EmailOptions.SectionName));
builder.Services.Configure<ScheduleReminderOptions>(
    builder.Configuration.GetSection(ScheduleReminderOptions.SectionName));
builder.Services.AddHttpClient<ResendEmailSender>(client =>
{
    client.BaseAddress = new Uri("https://api.resend.com/");
    client.Timeout = TimeSpan.FromSeconds(15);
});
builder.Services.AddTransient<IEmailSender<ApplicationUser>>(services =>
    services.GetRequiredService<ResendEmailSender>());
builder.Services.AddHostedService<ScheduleReminderWorker>();

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

builder.Services.AddAuthorizationBuilder()
    .AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("identity", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 20,
                QueueLimit = 0,
                Window = TimeSpan.FromMinutes(5)
            }));
});

builder.Services.AddOptions<AiAgentQuotaOptions>()
    .BindConfiguration(AiAgentQuotaOptions.SectionName)
    .ValidateDataAnnotations()
    .ValidateOnStart();
builder.Services.AddSingleton<AiModelService>();
builder.Services.AddScoped<InterviewPreparationAgent>();
builder.Services.AddScoped<AiAgentRunRecorder>();

builder.Services.AddScoped<InterviewPreparationTools>();

var app = builder.Build();

var forwardedHeadersOptions = new ForwardedHeadersOptions
{
    ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto
};
forwardedHeadersOptions.KnownIPNetworks.Clear();
forwardedHeadersOptions.KnownProxies.Clear();
app.UseForwardedHeaders(forwardedHeadersOptions);
app.UseRateLimiter();

app.Use(async (context, next) =>
{
    var path = context.Request.Path;
    var shouldPreventIndexing =
        path.StartsWithSegments("/api") ||
        path.StartsWithSegments("/health") ||
        path.StartsWithSegments("/login") ||
        path.StartsWithSegments("/register") ||
        path.StartsWithSegments("/forgot-password") ||
        path.StartsWithSegments("/reset-password") ||
        path.StartsWithSegments("/account") ||
        path.StartsWithSegments("/admin") ||
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

await using (var scope = app.Services.CreateAsyncScope())
{
    app.Logger.LogInformation("Ensuring administrator role configuration.");
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    if (!await roleManager.RoleExistsAsync("Admin"))
    {
        var createRoleResult = await roleManager.CreateAsync(new IdentityRole("Admin"));
        if (!createRoleResult.Succeeded)
        {
            throw new InvalidOperationException(
                $"Unable to create the Admin role: {string.Join(", ", createRoleResult.Errors.Select(error => error.Description))}");
        }
    }

    var bootstrapEmail = builder.Configuration["Admin:BootstrapEmail"]?.Trim();
    if (!string.IsNullOrEmpty(bootstrapEmail))
    {
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var bootstrapUser = await userManager.FindByEmailAsync(bootstrapEmail);
        if (bootstrapUser is not null && !await userManager.IsInRoleAsync(bootstrapUser, "Admin"))
        {
            var addRoleResult = await userManager.AddToRoleAsync(bootstrapUser, "Admin");
            if (!addRoleResult.Succeeded)
            {
                throw new InvalidOperationException(
                    $"Unable to assign the Admin role: {string.Join(", ", addRoleResult.Errors.Select(error => error.Description))}");
            }
        }
    }

    app.Logger.LogInformation("Administrator role configuration is ready.");
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
    app.UseDefaultFiles(new DefaultFilesOptions
    {
        RedirectToAppendTrailingSlash = false
    });
    app.UseStaticFiles();
}

app.UseAuthentication();

app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api") &&
        context.User.Identity?.IsAuthenticated == true)
    {
        var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is not null)
        {
            var dbContext = context.RequestServices.GetRequiredService<AppDbContext>();
            var accountState = await dbContext.Users
                .AsNoTracking()
                .Where(user => user.Id == userId)
                .Select(user => new { user.DisabledAtUtc, user.LastSeenAtUtc })
                .SingleOrDefaultAsync();

            if (accountState is null || accountState.DisabledAtUtc is not null)
            {
                var signInManager = context.RequestServices
                    .GetRequiredService<SignInManager<ApplicationUser>>();
                await signInManager.SignOutAsync();
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return;
            }

            var now = DateTimeOffset.UtcNow;
            if (accountState.LastSeenAtUtc is null ||
                accountState.LastSeenAtUtc < now.AddMinutes(-5))
            {
                await dbContext.Users
                    .Where(user => user.Id == userId)
                    .ExecuteUpdateAsync(setters => setters
                        .SetProperty(user => user.LastSeenAtUtc, now));
            }
        }
    }

    await next();
});

app.UseAuthorization();
var auth = app.MapGroup("/api/auth");

auth.MapIdentityApi<ApplicationUser>()
    .RequireRateLimiting("identity");

auth.MapGoogleAuthentication(
    googleAuthenticationEnabled,
    builder.Configuration["Authentication:FrontendBaseUrl"]);

auth.MapGet("/me", async (
    ClaimsPrincipal principal,
    UserManager<ApplicationUser> userManager) =>
{
    var userId = principal.FindFirstValue(ClaimTypes.NameIdentifier);
    var user = userId is null ? null : await userManager.FindByIdAsync(userId);
    if (user is null)
    {
        return Results.Unauthorized();
    }

    return Results.Ok(new
    {
        id = user.Id,
        email = user.Email,
        displayName = user.DisplayName,
        isAdmin = await userManager.IsInRoleAsync(user, "Admin")
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
    // Serve the prerendered public pages directly. The SPA fallback otherwise
    // handles directory-style routes before DefaultFiles can resolve index.html.
    foreach (var publicPath in new[]
    {
        "/",
        "/privacy",
        "/terms",
        "/guide/job-application-tracking"
    })
    {
        var pagePath = publicPath;
        var htmlPath = Path.Combine(
            app.Environment.WebRootPath,
            pagePath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar),
            "index.html");

        app.MapGet(pagePath, () => Results.File(htmlPath, "text/html"));
    }

    app.MapFallbackToFile("spa-shell.html");
}

if (app.Environment.IsDevelopment())
{
    app.MapGet("/api/ai/test-next-interview", async (
        ClaimsPrincipal user,
        InterviewPreparationTools tools,
        CancellationToken cancellationToken) =>
    {
        var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);

        if (userId is null)
        {
            return Results.Unauthorized();
        }

        var interview = await tools.GetNextInterviewAsync(
            userId,
            cancellationToken);

        return Results.Ok(new
        {
            found = interview is not null,
            interview
        });
    }).RequireAuthorization();

    app.MapPost("/api/ai/test", async (
        AiModelService ai,
        CancellationToken cancellationToken) =>
    {
        var response = await ai.TestAsync(cancellationToken);

        app.Logger.LogInformation(
            "AI test usage: input={Input}, output={Output}, total={Total}",
            response.Usage?.InputTokenCount,
            response.Usage?.OutputTokenCount,
            response.Usage?.TotalTokenCount);

        return Results.Ok(new
        {
            text = response.GetOutputText(),
            status = response.Status?.ToString(),
            inputTokens = response.Usage?.InputTokenCount,
            outputTokens = response.Usage?.OutputTokenCount,
            totalTokens = response.Usage?.TotalTokenCount
        });
    }).RequireAuthorization();

    app.MapPost("/api/ai/test-tool-selection", async (
    ClaimsPrincipal user,
    AiModelService ai,
    InterviewPreparationTools tools,
    CancellationToken cancellationToken) =>
{
    var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    var response = await ai.TestToolSelectionAsync(cancellationToken);

    var calls = response.OutputItems
        .OfType<FunctionCallResponseItem>()
        .ToArray();

    // Execute at most one tool in this test.
    if (calls.Length > 1)
    {
        return Results.BadRequest(new
        {
            error = "Tool call limit exceeded."
        });
    }

    if (calls.Length == 0)
    {
        return Results.Ok(new
        {
            text = response.GetOutputText(),
            toolExecuted = false
        });
    }

    var call = calls[0];

    // Only execute tools explicitly supported by the backend.
    if (call.FunctionName != "get_next_interview")
    {
        return Results.BadRequest(new
        {
            error = "Unknown tool."
        });
    }

    var interview = await tools.GetNextInterviewAsync(
        userId,
        cancellationToken);

    var toolResult = JsonSerializer.Serialize(new
    {
        found = interview is not null,
        interview = interview is null ? null : new
        {
            interview.ApplicationId,
            interview.CompanyName,
            interview.JobTitle,
            interview.StartsAt,
            interview.TimeZone,
            interview.IsAllDay
        }
    });

    var continuedResponse = await ai.ContinueAfterToolAsync(
        response,
        call.CallId,
        toolResult,
        cancellationToken);

    var pendingToolCalls = continuedResponse.OutputItems
        .OfType<FunctionCallResponseItem>()
        .Select(item => new
        {
            callId = item.CallId,
            name = item.FunctionName,
            arguments = item.FunctionArguments.ToString()
        })
        .ToArray();

    return Results.Ok(new
    {
        text = continuedResponse.GetOutputText(),
        pendingToolCalls,
        modelCalls = 2,
        toolExecutions = 1,
        inputTokens =
            (response.Usage?.InputTokenCount ?? 0) +
            (continuedResponse.Usage?.InputTokenCount ?? 0),
        outputTokens =
            (response.Usage?.OutputTokenCount ?? 0) +
            (continuedResponse.Usage?.OutputTokenCount ?? 0),
        totalTokens =
            (response.Usage?.TotalTokenCount ?? 0) +
            (continuedResponse.Usage?.TotalTokenCount ?? 0)
    });
}).RequireAuthorization();

    app.MapPost("/api/ai/test-agent/{applicationId:int}", async (
        int applicationId,
        ClaimsPrincipal user,
        InterviewPreparationAgent agent,
        HttpContext httpContext,
        CancellationToken cancellationToken) =>
    {
        var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);

        if (userId is null)
        {
            return Results.Unauthorized();
        }

        try
        {
            var result = await agent.RunAsync(
                userId,
                applicationId,
                cancellationToken);

            return Results.Ok(result);
        }
        catch (AiAgentQuotaExceededException exception)
        {
            var retryAfterSeconds = Math.Max(
                0,
                (int)Math.Ceiling(
                    (exception.ResetAtUtc - DateTimeOffset.UtcNow).TotalSeconds));
            httpContext.Response.Headers["Retry-After"] =
                retryAfterSeconds.ToString(
                    System.Globalization.CultureInfo.InvariantCulture);

            return Results.Json(
                new
                {
                    code = "daily_run_quota_exceeded",
                    dailyRunLimit = exception.DailyRunLimit,
                    resetAtUtc = exception.ResetAtUtc
                },
                statusCode: StatusCodes.Status429TooManyRequests);
        }
        catch (OperationCanceledException)
            when (!cancellationToken.IsCancellationRequested)
        {
            return Results.Problem(
                title: "Interview preparation timed out.",
                detail: "Please try again later.",
                statusCode: StatusCodes.Status504GatewayTimeout);
        }
    }).RequireAuthorization();
}

app.MapPost("/api/applications/{applicationId:int:min(1)}/interview-preparation", async (
    int applicationId,
    ClaimsPrincipal user,
    IServiceProvider services,
    IConfiguration configuration,
    HttpContext httpContext,
    CancellationToken cancellationToken) =>
{
    var userId = user.FindFirstValue(ClaimTypes.NameIdentifier);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    if (string.IsNullOrWhiteSpace(configuration["OpenAI:ApiKey"]))
    {
        return Results.Json(
            new
            {
                code = "ai_unavailable",
                message = "Interview preparation is temporarily unavailable. Please try again later."
            },
            statusCode: StatusCodes.Status503ServiceUnavailable);
    }

    try
    {
        var agent = services.GetRequiredService<InterviewPreparationAgent>();
        var result = await agent.RunAsync(
            userId,
            applicationId,
            cancellationToken);
        return Results.Ok(result);
    }
    catch (ApplicationNotFoundException)
    {
        return Results.NotFound();
    }
    catch (AiAgentQuotaExceededException exception)
    {
        var retryAfterSeconds = Math.Max(
            0,
            (int)Math.Ceiling(
                (exception.ResetAtUtc - DateTimeOffset.UtcNow).TotalSeconds));
        httpContext.Response.Headers["Retry-After"] =
            retryAfterSeconds.ToString(
                System.Globalization.CultureInfo.InvariantCulture);

        return Results.Json(
            new
            {
                code = "daily_run_quota_exceeded",
                dailyRunLimit = exception.DailyRunLimit,
                resetAtUtc = exception.ResetAtUtc
            },
            statusCode: StatusCodes.Status429TooManyRequests);
    }
    catch (OperationCanceledException)
        when (!cancellationToken.IsCancellationRequested)
    {
        return Results.Problem(
            title: "Interview preparation timed out.",
            detail: "Please try again later.",
            statusCode: StatusCodes.Status504GatewayTimeout);
    }
    catch (OperationCanceledException)
        when (cancellationToken.IsCancellationRequested)
    {
        throw;
    }
    catch (Exception exception)
    {
        app.Logger.LogError(
            exception,
            "Interview preparation failed for user {UserId}.",
            userId);
        return Results.Problem(
            title: "Interview preparation is temporarily unavailable.",
            detail: "Please try again later.",
            statusCode: StatusCodes.Status500InternalServerError);
    }
}).RequireAuthorization();

app.Run();

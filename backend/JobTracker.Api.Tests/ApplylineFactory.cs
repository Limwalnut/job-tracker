using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using JobTracker.Api.Data;
using JobTracker.Api.Models;
using JobTracker.Api.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Configuration;

namespace JobTracker.Api.Tests;

internal sealed class ApplylineFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _connection = new("Data Source=:memory:");
    private readonly int _requestsPerMinute;
    private readonly int _maxActiveTokens;

    public ApplylineFactory(int requestsPerMinute = 120, int maxActiveTokens = 10)
    {
        _requestsPerMinute = requestsPerMinute;
        _maxActiveTokens = maxActiveTokens;
        _connection.Open();
        using var context = new SqliteTestAppDbContext(
            new DbContextOptionsBuilder<AppDbContext>()
                .UseSqlite(_connection)
                .Options);
        context.Database.EnsureCreated();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureAppConfiguration((_, configuration) =>
        {
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Host=localhost;Database=unused;Username=unused;Password=unused",
                ["PersonalApiTokens:RequestsPerMinute"] = _requestsPerMinute.ToString(System.Globalization.CultureInfo.InvariantCulture),
                ["PersonalApiTokens:MaxActiveTokens"] = _maxActiveTokens.ToString(System.Globalization.CultureInfo.InvariantCulture),
                ["Admin:BootstrapEmail"] = ""
            });
        });

        builder.ConfigureTestServices(services =>
        {
            foreach (var descriptor in services.Where(descriptor =>
                         descriptor.ServiceType.FullName?.Contains("IDbContextOptionsConfiguration", StringComparison.Ordinal) == true)
                     .ToArray())
            {
                services.Remove(descriptor);
            }

            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<AppDbContext>();
            services.AddDbContext<AppDbContext>(options => options.UseSqlite(_connection));
            services.Replace(ServiceDescriptor.Scoped<AppDbContext, SqliteTestAppDbContext>());

            services.RemoveAll<IEmailSender<ApplicationUser>>();
            services.AddTransient<IEmailSender<ApplicationUser>, TestEmailSender>();

            var reminderWorker = services.FirstOrDefault(descriptor =>
                descriptor.ServiceType == typeof(Microsoft.Extensions.Hosting.IHostedService) &&
                descriptor.ImplementationType == typeof(ScheduleReminderWorker));
            if (reminderWorker is not null)
            {
                services.Remove(reminderWorker);
            }
        });
    }

    public async Task<TestIdentity> CreateIdentityAsync(
        string email,
        string password = "P@ssword123!",
        bool admin = false)
    {
        using var scope = Services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            EmailConfirmed = true,
            DisplayName = email.Split('@')[0]
        };
        var result = await users.CreateAsync(user, password);
        Assert.True(result.Succeeded, string.Join("; ", result.Errors.Select(error => error.Description)));

        if (admin)
        {
            var roles = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
            if (!await roles.RoleExistsAsync("Admin"))
            {
                Assert.True((await roles.CreateAsync(new IdentityRole("Admin"))).Succeeded);
            }
            Assert.True((await users.AddToRoleAsync(user, "Admin")).Succeeded);
        }

        return new TestIdentity(user.Id, email, password);
    }

    public async Task LoginWithCookieAsync(HttpClient client, TestIdentity identity)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login?useCookies=true", new
        {
            email = identity.Email,
            password = identity.Password
        });
        Assert.True(response.IsSuccessStatusCode, $"Cookie login failed with {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
        Assert.Contains(response.Headers, header => header.Key.Equals("Set-Cookie", StringComparison.OrdinalIgnoreCase));
    }

    public async Task<string> CreateTokenAsync(HttpClient cookieClient, string name, DateTimeOffset? expiresAt = null)
    {
        var response = await cookieClient.PostAsJsonAsync("/api/account/tokens", new
        {
            name,
            expiresAt
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        using var document = System.Text.Json.JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.GetProperty("token").GetString()!;
    }

    public HttpClient CreateTokenClient(string token)
    {
        var client = CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            HandleCookies = false
        });
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    public async Task<T> InScopeAsync<T>(Func<AppDbContext, Task<T>> action)
    {
        using var scope = Services.CreateScope();
        return await action(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            _connection.Dispose();
        }
    }
}

internal sealed class SqliteTestAppDbContext(DbContextOptions<AppDbContext> options)
    : AppDbContext(options)
{
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        var converter = new Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<DateTimeOffset, long>(
            value => value.UtcTicks,
            value => new DateTimeOffset(value, TimeSpan.Zero));
        foreach (var property in modelBuilder.Model.GetEntityTypes()
                     .SelectMany(entity => entity.GetProperties())
                     .Where(property => property.ClrType == typeof(DateTimeOffset) ||
                                        Nullable.GetUnderlyingType(property.ClrType) == typeof(DateTimeOffset)))
        {
            property.SetValueConverter(converter);
        }
    }
}

internal sealed record TestIdentity(string UserId, string Email, string Password);

internal sealed class TestEmailSender : IEmailSender<ApplicationUser>
{
    public Task SendConfirmationLinkAsync(ApplicationUser user, string email, string confirmationLink) => Task.CompletedTask;
    public Task SendPasswordResetLinkAsync(ApplicationUser user, string email, string resetLink) => Task.CompletedTask;
    public Task SendPasswordResetCodeAsync(ApplicationUser user, string email, string resetCode) => Task.CompletedTask;
}

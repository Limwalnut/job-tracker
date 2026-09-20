using JobTracker.Api.Data;
using Microsoft.EntityFrameworkCore;
using System.Text.Json.Serialization;
using JobTracker.Api.Models;
using Microsoft.AspNetCore.Identity;
using System.Security.Claims;

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

builder.Services
    .AddIdentityApiEndpoints<ApplicationUser>()
    .AddEntityFrameworkStores<AppDbContext>();

builder.Services.AddAuthorization();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();


app.UseAuthentication();

app.UseAuthorization();
var auth = app.MapGroup("/api/auth");

auth.MapIdentityApi<ApplicationUser>();

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

app.Run();

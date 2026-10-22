using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using JobTracker.Api.Data;
using JobTracker.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JobTracker.Api.Tests;

public sealed class PersonalApiTokenAccessTests
{
    [Fact]
    public async Task Token_can_use_every_allowlisted_application_event_and_checklist_route()
    {
        using var factory = new ApplylineFactory();
        var identity = await factory.CreateIdentityAsync("allowlist@example.test");
        using var cookie = factory.CreateClient(new() { AllowAutoRedirect = false });
        await factory.LoginWithCookieAsync(cookie, identity);
        var secret = await factory.CreateTokenAsync(cookie, "all data access");
        using var token = factory.CreateTokenClient(secret);
        var today = DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd");

        var createApplication = await token.PostAsJsonAsync("/api/applications", new
        {
            companyName = "Northstar",
            jobTitle = "Engineer",
            appliedDate = today,
            notes = "created through token"
        });
        Assert.Equal(HttpStatusCode.Created, createApplication.StatusCode);
        using var applicationJson = JsonDocument.Parse(await createApplication.Content.ReadAsStringAsync());
        var applicationId = applicationJson.RootElement.GetProperty("id").GetInt32();
        Assert.Equal(identity.UserId, applicationJson.RootElement.GetProperty("userId").GetString());

        foreach (var path in new[]
        {
            "/api/auth/me",
            "/api/applications",
            "/api/applications/paged",
            $"/api/applications/{applicationId}",
            $"/api/applications/{applicationId}/timeline",
            $"/api/applications/{applicationId}/events",
            $"/api/applications/{applicationId}/checklist"
        })
        {
            await AssertSameStatusAndJsonShapeAsync(token, cookie, path);
        }

        Assert.Equal(HttpStatusCode.OK, (await token.GetAsync("/api/applications")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await token.GetAsync("/api/applications/paged")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await token.GetAsync($"/api/applications/{applicationId}")).StatusCode);

        var updateApplication = await token.PutAsJsonAsync($"/api/applications/{applicationId}", new
        {
            companyName = "Northstar Systems",
            jobTitle = "Senior Engineer",
            appliedDate = today,
            status = "Applied"
        });
        Assert.Equal(HttpStatusCode.NoContent, updateApplication.StatusCode);

        var changeStatus = await token.PatchAsJsonAsync($"/api/applications/{applicationId}/status", new
        {
            status = "Screening"
        });
        Assert.Equal(HttpStatusCode.NoContent, changeStatus.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await token.GetAsync($"/api/applications/{applicationId}/timeline")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await token.PostAsync($"/api/applications/{applicationId}/timeline/undo", content: null)).StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await token.GetAsync($"/api/applications/{applicationId}/events")).StatusCode);
        var start = DateTimeOffset.UtcNow.AddDays(1);
        var createEvent = await token.PostAsJsonAsync($"/api/applications/{applicationId}/events", new
        {
            title = "Follow up",
            type = "FollowUp",
            startsAt = start,
            endsAt = start.AddMinutes(30),
            timeZone = "UTC",
            notes = "created through token"
        });
        Assert.Equal(HttpStatusCode.Created, createEvent.StatusCode);
        using var eventJson = JsonDocument.Parse(await createEvent.Content.ReadAsStringAsync());
        var eventId = eventJson.RootElement.GetProperty("id").GetInt32();
        await AssertSameStatusAndJsonShapeAsync(
            token,
            cookie,
            $"/api/applications/{applicationId}/events");

        var from = start.AddDays(-1).ToString("O");
        var to = start.AddDays(1).ToString("O");
        await AssertSameStatusAndJsonShapeAsync(
            token,
            cookie,
            $"/api/events?from={Uri.EscapeDataString(from)}&to={Uri.EscapeDataString(to)}");
        await AssertSameStatusAndJsonShapeAsync(token, cookie, $"/api/events/{eventId}");

        var updateEvent = await token.PutAsJsonAsync($"/api/events/{eventId}", new
        {
            title = "Follow up updated",
            type = "FollowUp",
            status = "Scheduled",
            startsAt = start,
            endsAt = start.AddMinutes(45),
            timeZone = "UTC"
        });
        Assert.Equal(HttpStatusCode.NoContent, updateEvent.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await token.DeleteAsync($"/api/events/{eventId}")).StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await token.GetAsync($"/api/applications/{applicationId}/checklist")).StatusCode);
        var createChecklistItem = await token.PostAsJsonAsync($"/api/applications/{applicationId}/checklist", new
        {
            title = "Prepare portfolio",
            dueDate = today
        });
        Assert.Equal(HttpStatusCode.Created, createChecklistItem.StatusCode);
        using var checklistJson = JsonDocument.Parse(await createChecklistItem.Content.ReadAsStringAsync());
        var checklistId = checklistJson.RootElement.GetProperty("id").GetInt32();
        Assert.Equal(HttpStatusCode.NoContent, (await token.PutAsJsonAsync($"/api/checklist/{checklistId}", new
        {
            title = "Prepare updated portfolio",
            dueDate = today,
            isCompleted = true
        })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await token.DeleteAsync($"/api/checklist/{checklistId}")).StatusCode);

        Assert.Equal(HttpStatusCode.NoContent, (await token.DeleteAsync($"/api/applications/{applicationId}")).StatusCode);
        var lastUsed = await factory.InScopeAsync(db => db.PersonalApiTokens
            .Where(candidate => candidate.UserId == identity.UserId)
            .Select(candidate => candidate.LastUsedAtUtc)
            .SingleAsync());
        Assert.NotNull(lastUsed);
    }

    private static async Task AssertSameStatusAndJsonShapeAsync(HttpClient token, HttpClient cookie, string path)
    {
        using var patResponse = await token.GetAsync(path);
        using var cookieResponse = await cookie.GetAsync(path);
        Assert.Equal(cookieResponse.StatusCode, patResponse.StatusCode);
        var patBody = await patResponse.Content.ReadAsStringAsync();
        var cookieBody = await cookieResponse.Content.ReadAsStringAsync();
        using var patJson = JsonDocument.Parse(patBody);
        using var cookieJson = JsonDocument.Parse(cookieBody);
        Assert.Equal(Shape(cookieJson.RootElement), Shape(patJson.RootElement));
    }

    private static string Shape(JsonElement element) => element.ValueKind switch
    {
        JsonValueKind.Object => "object{" + string.Join(",", element.EnumerateObject()
            .OrderBy(property => property.Name, StringComparer.Ordinal)
            .Select(property => property.Name + ":" + Shape(property.Value))) + "}",
        JsonValueKind.Array => "array[" + (element.GetArrayLength() == 0
            ? ""
            : Shape(element[0])) + "]",
        _ => element.ValueKind.ToString()
    };

    [Fact]
    public async Task Personal_token_cannot_read_or_change_another_users_applications_events_or_checklist()
    {
        using var factory = new ApplylineFactory();
        var owner = await factory.CreateIdentityAsync("owner-a@example.test");
        var other = await factory.CreateIdentityAsync("owner-b@example.test");
        int otherApplicationId = 0;
        int otherEventId = 0;
        int otherChecklistId = 0;
        await factory.InScopeAsync(async db =>
        {
            var application = new JobApplication
            {
                UserId = other.UserId,
                CompanyName = "Private Company",
                JobTitle = "Private Role",
                AppliedDate = DateOnly.FromDateTime(DateTime.UtcNow),
                Status = ApplicationStatus.Applied
            };
            db.Applications.Add(application);
            await db.SaveChangesAsync();
            otherApplicationId = application.Id;
            var applicationEvent = new ApplicationEvent
            {
                ApplicationId = application.Id,
                Title = "Private interview",
                Type = ApplicationEventType.Interview,
                StartsAt = DateTimeOffset.UtcNow.AddDays(1),
                EndsAt = DateTimeOffset.UtcNow.AddDays(1).AddMinutes(30),
                TimeZone = "UTC"
            };
            var checklistItem = new ApplicationChecklistItem
            {
                ApplicationId = application.Id,
                Title = "Private checklist item",
                CreatedAtUtc = DateTimeOffset.UtcNow,
                UpdatedAtUtc = DateTimeOffset.UtcNow
            };
            db.ApplicationEvents.Add(applicationEvent);
            db.ApplicationChecklistItems.Add(checklistItem);
            await db.SaveChangesAsync();
            otherEventId = applicationEvent.Id;
            otherChecklistId = checklistItem.Id;
            return 0;
        });

        using var cookie = factory.CreateClient(new() { AllowAutoRedirect = false });
        await factory.LoginWithCookieAsync(cookie, owner);
        var secret = await factory.CreateTokenAsync(cookie, "owner A only");
        using var token = factory.CreateTokenClient(secret);

        Assert.Equal(HttpStatusCode.NotFound, (await token.GetAsync($"/api/applications/{otherApplicationId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await token.PutAsJsonAsync($"/api/applications/{otherApplicationId}", new
        {
            companyName = "Tampered",
            jobTitle = "Tampered",
            appliedDate = DateOnly.FromDateTime(DateTime.UtcNow),
            status = "Applied"
        })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await token.DeleteAsync($"/api/applications/{otherApplicationId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await token.GetAsync($"/api/events/{otherEventId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await token.PutAsJsonAsync($"/api/events/{otherEventId}", new
        {
            title = "Tampered",
            type = "Interview",
            status = "Scheduled",
            startsAt = DateTimeOffset.UtcNow.AddDays(1),
            endsAt = DateTimeOffset.UtcNow.AddDays(1).AddMinutes(30),
            timeZone = "UTC",
            interviewRound = 1,
            interviewOutcome = "Pending"
        })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await token.DeleteAsync($"/api/events/{otherEventId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await token.GetAsync($"/api/applications/{otherApplicationId}/checklist")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await token.PutAsJsonAsync($"/api/checklist/{otherChecklistId}", new
        {
            title = "Tampered",
            isCompleted = true
        })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await token.DeleteAsync($"/api/checklist/{otherChecklistId}")).StatusCode);

        var unchanged = await factory.InScopeAsync(async db => new
        {
            Application = await db.Applications.AsNoTracking().SingleAsync(row => row.Id == otherApplicationId),
            Event = await db.ApplicationEvents.AsNoTracking().SingleAsync(row => row.Id == otherEventId),
            Checklist = await db.ApplicationChecklistItems.AsNoTracking().SingleAsync(row => row.Id == otherChecklistId)
        });
        Assert.Equal("Private Company", unchanged.Application.CompanyName);
        Assert.Equal("Private interview", unchanged.Event.Title);
        Assert.Equal("Private checklist item", unchanged.Checklist.Title);
    }

    [Fact]
    public async Task Expiry_disable_reenable_and_password_changes_control_token_validity()
    {
        using var factory = new ApplylineFactory();
        var identity = await factory.CreateIdentityAsync("lifecycle@example.test");
        using var cookie = factory.CreateClient(new() { AllowAutoRedirect = false });
        await factory.LoginWithCookieAsync(cookie, identity);
        var secret = await factory.CreateTokenAsync(cookie, "lifecycle token");
        using var token = factory.CreateTokenClient(secret);
        Assert.Equal(HttpStatusCode.OK, (await token.GetAsync("/api/auth/me")).StatusCode);

        await factory.InScopeAsync(async db =>
        {
            var record = await db.PersonalApiTokens.SingleAsync(candidate => candidate.UserId == identity.UserId);
            record.ExpiresAtUtc = DateTimeOffset.UtcNow.AddMinutes(-1);
            await db.SaveChangesAsync();
            return 0;
        });
        Assert.Equal(HttpStatusCode.Unauthorized, (await token.GetAsync("/api/auth/me")).StatusCode);

        using var validCookie = factory.CreateClient(new() { AllowAutoRedirect = false });
        await factory.LoginWithCookieAsync(validCookie, identity);
        var expiringSecret = await factory.CreateTokenAsync(validCookie, "disable test");
        using var expiringToken = factory.CreateTokenClient(expiringSecret);
        await factory.InScopeAsync(async db =>
        {
            var user = await db.Users.SingleAsync(candidate => candidate.Id == identity.UserId);
            user.DisabledAtUtc = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();
            return 0;
        });
        Assert.Equal(HttpStatusCode.Unauthorized, (await expiringToken.GetAsync("/api/auth/me")).StatusCode);
        await factory.InScopeAsync(async db =>
        {
            var user = await db.Users.SingleAsync(candidate => candidate.Id == identity.UserId);
            user.DisabledAtUtc = null;
            await db.SaveChangesAsync();
            return 0;
        });
        Assert.Equal(HttpStatusCode.OK, (await expiringToken.GetAsync("/api/auth/me")).StatusCode);

        var changePassword = await validCookie.PostAsJsonAsync("/api/account/password", new
        {
            currentPassword = identity.Password,
            newPassword = "NewP@ssword123!"
        });
        Assert.Equal(HttpStatusCode.OK, changePassword.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await expiringToken.GetAsync("/api/auth/me")).StatusCode);

        var afterChange = await factory.CreateTokenAsync(validCookie, "reset test");
        using var resetToken = factory.CreateTokenClient(afterChange);
        string resetCode;
        using (var scope = factory.Services.CreateScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var user = await users.FindByIdAsync(identity.UserId);
            resetCode = await users.GeneratePasswordResetTokenAsync(user!);
        }
        var reset = await validCookie.PostAsJsonAsync("/api/auth/resetPassword", new
        {
            email = identity.Email,
            resetCode = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(resetCode)),
            newPassword = "ResetP@ssword123!"
        });
        Assert.True(reset.IsSuccessStatusCode, $"Reset failed with {(int)reset.StatusCode}: {await reset.Content.ReadAsStringAsync()}");
        Assert.Equal(HttpStatusCode.Unauthorized, (await resetToken.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task Active_token_limit_is_enforced_and_revoking_another_users_token_returns_404()
    {
        using var factory = new ApplylineFactory(maxActiveTokens: 1);
        var owner = await factory.CreateIdentityAsync("limit-owner@example.test");
        var other = await factory.CreateIdentityAsync("limit-other@example.test");
        using var ownerCookie = factory.CreateClient(new() { AllowAutoRedirect = false });
        await factory.LoginWithCookieAsync(ownerCookie, owner);
        var ownerSecret = await factory.CreateTokenAsync(ownerCookie, "owner token");
        var tooMany = await ownerCookie.PostAsJsonAsync("/api/account/tokens", new { name = "second" });
        Assert.Equal(HttpStatusCode.Conflict, tooMany.StatusCode);

        using var otherCookie = factory.CreateClient(new() { AllowAutoRedirect = false });
        await factory.LoginWithCookieAsync(otherCookie, other);
        var otherSecret = await factory.CreateTokenAsync(otherCookie, "other token");
        using var ownerToken = factory.CreateTokenClient(ownerSecret);
        Assert.Equal(HttpStatusCode.OK, (await ownerToken.GetAsync("/api/auth/me")).StatusCode);

        using var otherDocument = JsonDocument.Parse(await otherCookie.GetStringAsync("/api/account/tokens"));
        var otherId = otherDocument.RootElement[0].GetProperty("id").GetGuid();
        using var ownerDocument = JsonDocument.Parse(await ownerCookie.GetStringAsync("/api/account/tokens"));
        Assert.Single(ownerDocument.RootElement.EnumerateArray());
        var forbiddenRevoke = await ownerCookie.DeleteAsync($"/api/account/tokens/{otherId}");
        Assert.Equal(HttpStatusCode.NotFound, forbiddenRevoke.StatusCode);
        using var otherToken = factory.CreateTokenClient(otherSecret);
        Assert.Equal(HttpStatusCode.OK, (await otherToken.GetAsync("/api/auth/me")).StatusCode);

        var emptyName = await otherCookie.PostAsJsonAsync("/api/account/tokens", new { name = "   " });
        Assert.Equal(HttpStatusCode.BadRequest, emptyName.StatusCode);
    }
}

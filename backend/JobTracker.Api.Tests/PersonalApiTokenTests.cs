using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Json;
using JobTracker.Api.Data;
using JobTracker.Api.Models;
using JobTracker.Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JobTracker.Api.Tests;

public sealed class PersonalApiTokenTests
{
    [Fact]
    public async Task Token_can_be_created_listed_and_revoked_and_only_hash_is_persisted()
    {
        using var factory = new ApplylineFactory();
        var identity = await factory.CreateIdentityAsync("owner@example.test");
        using var cookie = factory.CreateClient(new() { AllowAutoRedirect = false });
        await factory.LoginWithCookieAsync(cookie, identity);

        var create = await cookie.PostAsJsonAsync("/api/account/tokens", new
        {
            name = "Gogo integration",
            expiresAt = (DateTimeOffset?)null
        });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var createBody = await create.Content.ReadAsStringAsync();
        using var createdJson = JsonDocument.Parse(createBody);
        var secret = createdJson.RootElement.GetProperty("token").GetString()!;
        var tokenId = createdJson.RootElement.GetProperty("id").GetGuid();
        Assert.StartsWith("apl_pat_", secret, StringComparison.Ordinal);
        Assert.Equal(1, CountOccurrences(createBody, secret));

        var persisted = await factory.InScopeAsync(db => db.Set<PersonalApiToken>()
            .SingleAsync(token => token.Id == tokenId));
        Assert.Equal(identity.UserId, persisted.UserId);
        Assert.Equal("Gogo integration", persisted.Name);
        Assert.Null(persisted.ExpiresAtUtc);
        Assert.Null(persisted.RevokedAtUtc);
        Assert.Equal(PersonalApiTokenService.HashSecret(secret["apl_pat_".Length..]), persisted.SecretHash);
        Assert.Equal(64, persisted.SecretHash.Length);
        Assert.StartsWith("apl_pat_", persisted.DisplayPrefix, StringComparison.Ordinal);
        Assert.DoesNotContain(secret, persisted.SecretHash, StringComparison.Ordinal);
        Assert.NotEqual(secret, persisted.SecretHash);

        var list = await cookie.GetAsync("/api/account/tokens");
        Assert.Equal(HttpStatusCode.OK, list.StatusCode);
        var listText = await list.Content.ReadAsStringAsync();
        Assert.DoesNotContain(secret, listText, StringComparison.Ordinal);
        using var listJson = JsonDocument.Parse(listText);
        var tokenMetadata = listJson.RootElement.EnumerateArray().Single();
        Assert.Equal("Gogo integration", tokenMetadata.GetProperty("name").GetString());
        Assert.StartsWith("apl_pat_", tokenMetadata.GetProperty("displayPrefix").GetString(), StringComparison.Ordinal);
        Assert.NotEqual(JsonValueKind.Null, tokenMetadata.GetProperty("createdAtUtc").ValueKind);
        Assert.Equal(JsonValueKind.Null, tokenMetadata.GetProperty("expiresAtUtc").ValueKind);
        Assert.Equal(JsonValueKind.Null, tokenMetadata.GetProperty("lastUsedAtUtc").ValueKind);
        Assert.Equal(JsonValueKind.Null, tokenMetadata.GetProperty("revokedAtUtc").ValueKind);
        Assert.Equal("active", tokenMetadata.GetProperty("status").GetString());
        Assert.False(tokenMetadata.TryGetProperty("token", out _));
        Assert.False(tokenMetadata.TryGetProperty("secret", out _));
        Assert.False(tokenMetadata.TryGetProperty("secretHash", out _));

        using var tokenClient = factory.CreateTokenClient(secret);
        Assert.Equal(HttpStatusCode.OK, (await tokenClient.GetAsync("/api/auth/me")).StatusCode);

        using var listAfterUseJson = JsonDocument.Parse(await cookie.GetStringAsync("/api/account/tokens"));
        var usedMetadata = listAfterUseJson.RootElement.EnumerateArray().Single();
        Assert.Equal("active", usedMetadata.GetProperty("status").GetString());
        Assert.NotEqual(JsonValueKind.Null, usedMetadata.GetProperty("lastUsedAtUtc").ValueKind);
        Assert.DoesNotContain(secret, listAfterUseJson.RootElement.ToString(), StringComparison.Ordinal);

        var revoke = await cookie.DeleteAsync($"/api/account/tokens/{tokenId}");
        Assert.Equal(HttpStatusCode.NoContent, revoke.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await tokenClient.GetAsync("/api/auth/me")).StatusCode);

        var listAfterRevoke = await cookie.GetStringAsync("/api/account/tokens");
        Assert.Contains("revoked", listAfterRevoke, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Invalid_token_inputs_are_rejected_without_cookie_redirects()
    {
        using var factory = new ApplylineFactory();
        var identity = await factory.CreateIdentityAsync("invalid@example.test");
        using var cookie = factory.CreateClient(new() { AllowAutoRedirect = false });
        await factory.LoginWithCookieAsync(cookie, identity);

        foreach (var invalid in new[] { "", "  ", new string('n', 101) })
        {
            var response = await cookie.PostAsJsonAsync("/api/account/tokens", new { name = invalid });
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Contains("errors", await response.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);
        }

        var past = await cookie.PostAsJsonAsync("/api/account/tokens", new
        {
            name = "expired immediately",
            expiresAt = DateTimeOffset.UtcNow.AddMinutes(-1)
        });
        Assert.Equal(HttpStatusCode.BadRequest, past.StatusCode);
        Assert.Contains("errors", await past.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);

        foreach (var badSecret in new[] { "apl_pat_missing", "apl_pat_", "apl_pat_!@#" })
        {
            using var client = factory.CreateTokenClient(badSecret);
            var response = await client.GetAsync("/api/auth/me");
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            Assert.NotEqual(HttpStatusCode.Redirect, response.StatusCode);
        }

        // A recognized bearer token must never fall back to an otherwise valid cookie.
        using var mixed = factory.CreateClient(new() { AllowAutoRedirect = false });
        await factory.LoginWithCookieAsync(mixed, identity);
        mixed.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "apl_pat_unknown");
        Assert.Equal(HttpStatusCode.Unauthorized, (await mixed.GetAsync("/api/applications")).StatusCode);
    }

    [Fact]
    public async Task Cookie_and_identity_bearer_authentication_continue_to_work()
    {
        using var factory = new ApplylineFactory();
        var identity = await factory.CreateIdentityAsync("auth-regression@example.test");
        using var cookie = factory.CreateClient(new() { AllowAutoRedirect = false });
        await factory.LoginWithCookieAsync(cookie, identity);
        Assert.Equal(HttpStatusCode.OK, (await cookie.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await cookie.GetAsync("/api/applications")).StatusCode);

        using var bearerClient = factory.CreateClient(new() { AllowAutoRedirect = false, HandleCookies = false });
        var login = await bearerClient.PostAsJsonAsync("/api/auth/login", new
        {
            email = identity.Email,
            password = identity.Password
        });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        using var loginJson = JsonDocument.Parse(await login.Content.ReadAsStringAsync());
        var accessToken = loginJson.RootElement.GetProperty("accessToken").GetString()!;
        bearerClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        Assert.Equal(HttpStatusCode.OK, (await bearerClient.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task Token_access_is_denied_for_account_management_and_admin_even_for_admin_owner()
    {
        using var factory = new ApplylineFactory();
        var identity = await factory.CreateIdentityAsync("admin-token@example.test", admin: true);
        using var cookie = factory.CreateClient(new() { AllowAutoRedirect = false });
        await factory.LoginWithCookieAsync(cookie, identity);
        var secret = await factory.CreateTokenAsync(cookie, "admin PAT");
        using var token = factory.CreateTokenClient(secret);
        using var tokenMetadata = JsonDocument.Parse(await cookie.GetStringAsync("/api/account/tokens"));
        var tokenId = tokenMetadata.RootElement[0].GetProperty("id").GetGuid();

        foreach (var (method, path, body) in new (HttpMethod Method, string Path, object? Body)[]
        {
            (HttpMethod.Get, "/api/account", null),
            (HttpMethod.Patch, "/api/account/profile", new { displayName = "Should not change" }),
            (HttpMethod.Post, "/api/account/password", new { currentPassword = identity.Password, newPassword = "N3wPass!word123" }),
            (HttpMethod.Get, "/api/account/tokens", null),
            (HttpMethod.Post, "/api/account/tokens", new { name = "forbidden" }),
            (HttpMethod.Delete, $"/api/account/tokens/{tokenId}", null),
            (HttpMethod.Post, "/api/auth/register", new { email = "forbidden@example.test", password = "P@ssword123!" }),
            (HttpMethod.Post, "/api/auth/login", new { email = identity.Email, password = identity.Password }),
            (HttpMethod.Post, "/api/auth/refresh", new { refreshToken = "unusable" }),
            (HttpMethod.Post, "/api/auth/confirmEmail", new { userId = identity.UserId, code = "unusable" }),
            (HttpMethod.Get, $"/api/auth/confirmEmail?userId={Uri.EscapeDataString(identity.UserId)}&code=unusable", null),
            (HttpMethod.Post, "/api/auth/resendConfirmationEmail", new { email = identity.Email }),
            (HttpMethod.Post, "/api/auth/forgotPassword", new { email = identity.Email }),
            (HttpMethod.Post, "/api/auth/resetPassword", new { email = identity.Email, resetCode = "unusable", newPassword = "P@ssword456!" }),
            (HttpMethod.Get, "/api/auth/manage/2fa", null),
            (HttpMethod.Post, "/api/auth/manage/2fa", new { enable = true }),
            (HttpMethod.Get, "/api/auth/manage/info", null),
            (HttpMethod.Post, "/api/auth/manage/info", new { email = "changed@example.test" }),
            (HttpMethod.Post, "/api/auth/logout", null),
            (HttpMethod.Get, "/api/auth/google", null),
            (HttpMethod.Get, "/api/auth/google/callback", null),
            (HttpMethod.Get, "/api/admin/users", null),
            (HttpMethod.Post, "/api/applications/1/interview-preparation", new { }),
            (HttpMethod.Get, "/health", null),
            (HttpMethod.Get, "/api/new-controller-added-later", null)
        })
        {
            using var request = new HttpRequestMessage(method, path);
            if (body is not null)
            {
                request.Content = JsonContent.Create(body);
            }
            var response = await token.SendAsync(request);
            Assert.True(response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden,
                $"{method} {path} accepted a PAT: {(int)response.StatusCode}");
        }

        // A valid PAT takes precedence over a valid cookie and stays denied on excluded routes.
        using var mixed = factory.CreateClient(new() { AllowAutoRedirect = false });
        await factory.LoginWithCookieAsync(mixed, identity);
        mixed.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", secret);
        foreach (var path in new[] { "/api/account", "/api/account/tokens", "/api/admin/users" })
        {
            var response = await mixed.GetAsync(path);
            Assert.True(response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden,
                $"Valid PAT fell back to cookie on excluded route {path}: {(int)response.StatusCode}");
        }

        using var bearerClient = factory.CreateClient(new() { AllowAutoRedirect = false, HandleCookies = false });
        var login = await bearerClient.PostAsJsonAsync("/api/auth/login", new
        {
            email = identity.Email,
            password = identity.Password
        });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        using var loginJson = JsonDocument.Parse(await login.Content.ReadAsStringAsync());
        bearerClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            loginJson.RootElement.GetProperty("accessToken").GetString());
        var bearerManagement = await bearerClient.GetAsync("/api/account/tokens");
        Assert.True(bearerManagement.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden,
            $"Identity bearer reached cookie-only token management: {(int)bearerManagement.StatusCode}");
        var bearerCreate = await bearerClient.PostAsJsonAsync("/api/account/tokens", new { name = "bearer must not create" });
        Assert.True(bearerCreate.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden,
            $"Identity bearer reached cookie-only token creation: {(int)bearerCreate.StatusCode}");
        var bearerRevoke = await bearerClient.DeleteAsync($"/api/account/tokens/{tokenId}");
        Assert.True(bearerRevoke.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden,
            $"Identity bearer reached cookie-only token revocation: {(int)bearerRevoke.StatusCode}");

        var stillActive = await factory.InScopeAsync(db => db.PersonalApiTokens
            .SingleAsync(candidate => candidate.Id == tokenId));
        Assert.Null(stillActive.RevokedAtUtc);
        Assert.Equal(1, await factory.InScopeAsync(db => db.PersonalApiTokens.CountAsync(candidate => candidate.UserId == identity.UserId)));
        using (var scope = factory.Services.CreateScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var user = await users.FindByIdAsync(identity.UserId);
            Assert.NotNull(user);
            Assert.Equal("admin-token", user!.DisplayName);
            Assert.True(await users.CheckPasswordAsync(user, identity.Password));
            Assert.Equal(1, await users.Users.CountAsync());
        }
    }

    [Fact]
    public async Task Per_token_rate_limit_returns_429()
    {
        using var factory = new ApplylineFactory(requestsPerMinute: 2);
        var identity = await factory.CreateIdentityAsync("rate-limit@example.test");
        using var cookie = factory.CreateClient(new() { AllowAutoRedirect = false });
        await factory.LoginWithCookieAsync(cookie, identity);
        var secret = await factory.CreateTokenAsync(cookie, "rate limited");
        using var token = factory.CreateTokenClient(secret);

        Assert.Equal(HttpStatusCode.OK, (await token.GetAsync("/api/applications")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await token.GetAsync("/api/applications")).StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, (await token.GetAsync("/api/applications")).StatusCode);
    }

    [Fact]
    public async Task Deleting_a_token_owner_makes_the_token_unusable()
    {
        using var factory = new ApplylineFactory();
        var identity = await factory.CreateIdentityAsync("deleted-owner@example.test");
        using var cookie = factory.CreateClient(new() { AllowAutoRedirect = false });
        await factory.LoginWithCookieAsync(cookie, identity);
        var secret = await factory.CreateTokenAsync(cookie, "delete owner test");
        using var token = factory.CreateTokenClient(secret);
        Assert.Equal(HttpStatusCode.OK, (await token.GetAsync("/api/auth/me")).StatusCode);

        using (var scope = factory.Services.CreateScope())
        {
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var user = await userManager.FindByIdAsync(identity.UserId);
            Assert.NotNull(user);
            Assert.True((await userManager.DeleteAsync(user!)).Succeeded);
        }

        Assert.Equal(HttpStatusCode.Unauthorized, (await token.GetAsync("/api/auth/me")).StatusCode);
        Assert.Empty(await factory.InScopeAsync(db => db.PersonalApiTokens
            .Where(candidate => candidate.UserId == identity.UserId)
            .ToListAsync()));
    }

    private static int CountOccurrences(string value, string occurrence)
    {
        var count = 0;
        var start = 0;
        while ((start = value.IndexOf(occurrence, start, StringComparison.Ordinal)) >= 0)
        {
            count++;
            start += occurrence.Length;
        }
        return count;
    }
}

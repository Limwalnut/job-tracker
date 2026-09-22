# Build the React frontend
FROM node:22-alpine AS frontend-build

WORKDIR /src/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build


# Build and publish the ASP.NET Core backend
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend-build

WORKDIR /src

COPY backend/JobTracker.Api/JobTracker.Api.csproj backend/JobTracker.Api/
RUN dotnet restore backend/JobTracker.Api/JobTracker.Api.csproj

COPY backend/JobTracker.Api/ backend/JobTracker.Api/

COPY --from=frontend-build \
    /src/frontend/dist \
    backend/JobTracker.Api/wwwroot

RUN dotnet publish \
    backend/JobTracker.Api/JobTracker.Api.csproj \
    --configuration Release \
    --output /app/publish \
    --no-restore \
    /p:UseAppHost=false


# Run the published application
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final

WORKDIR /app

ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_HTTP_PORTS=10000

EXPOSE 10000

COPY --from=backend-build /app/publish .

USER $APP_UID

ENTRYPOINT ["dotnet", "JobTracker.Api.dll"]
# .NET Logging Guidance

## Defaults

- Use `Microsoft.Extensions.Logging`.
- Prefer JSON logs in cloud and readable console logs locally.
- Configure log level via `ASPNETCORE_ENVIRONMENT` and `LOG_LEVEL`.

## Minimal Setup (Program.cs)

```csharp
builder.Logging.ClearProviders();
if (builder.Environment.IsDevelopment())
{
    builder.Logging.AddSimpleConsole();
}
else
{
    builder.Logging.AddJsonConsole();
}
```

## appsettings.json

- Keep `Logging:LogLevel:Default` configurable.
- Ensure error logs include exception details.

## Correlation

- If using ASP.NET, add request ID enrichment in middleware.
- Propagate `TraceIdentifier` and any distributed trace IDs.

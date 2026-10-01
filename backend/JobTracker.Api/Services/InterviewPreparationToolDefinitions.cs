using OpenAI.Responses;

#pragma warning disable OPENAI001

namespace JobTracker.Api.Services;

public static class InterviewPreparationToolDefinitions
{
    public static IReadOnlyList<ResponseTool> Create()
    {
        return
        [
            ResponseTool.CreateFunctionTool(
                functionName: "get_next_interview",
                functionParameters: BinaryData.FromString("""
                    {
                      "type": "object",
                      "properties": {},
                      "required": [],
                      "additionalProperties": false
                    }
                    """),
                strictModeEnabled: true,
                functionDescription:
                    "Get the current signed-in user's next scheduled interview. " +
                    "The result includes the application ID, company, role, " +
                    "start time, and time zone."),

            CreateApplicationTool(
                "get_application_context",
                "Read the job description and notes for an application " +
                "owned by the current signed-in user."),

            CreateApplicationTool(
                "get_checklist",
                "Read up to 20 checklist items for an application owned " +
                "by the current signed-in user. Incomplete items appear first.")
        ];
    }

    private static ResponseTool CreateApplicationTool(
        string name,
        string description)
    {
        return ResponseTool.CreateFunctionTool(
            functionName: name,
            functionParameters: BinaryData.FromString("""
                {
                  "type": "object",
                  "properties": {
                    "applicationId": {
                      "type": "integer",
                      "minimum": 1,
                      "description": "The application ID returned by another tool."
                    }
                  },
                  "required": ["applicationId"],
                  "additionalProperties": false
                }
                """),
            strictModeEnabled: true,
            functionDescription: description);
    }
}
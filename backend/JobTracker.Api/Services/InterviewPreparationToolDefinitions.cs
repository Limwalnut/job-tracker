using OpenAI.Responses;

#pragma warning disable OPENAI001

namespace JobTracker.Api.Services;

public static class InterviewPreparationToolDefinitions
{
    public static IReadOnlyList<ResponseTool> Create()
    {
        return
        [
            CreateCurrentApplicationTool(
                "get_application_interview",
                "Get the next scheduled interview for the current application, if one exists. " +
                "This tool is already restricted to the application being prepared."),
            CreateCurrentApplicationTool(
                "get_application_context",
                "Read the job description and notes for the current application. " +
                "This tool is already restricted to the application being prepared."),
            CreateCurrentApplicationTool(
                "get_checklist",
                "Read up to 20 checklist items for the current application, incomplete items first. " +
                "This tool is already restricted to the application being prepared.")
        ];
    }

    private static ResponseTool CreateCurrentApplicationTool(
        string name,
        string description)
    {
        return ResponseTool.CreateFunctionTool(
            functionName: name,
            functionParameters: BinaryData.FromString("""
                {
                  "type": "object",
                  "properties": {},
                  "required": [],
                  "additionalProperties": false
                }
                """),
            strictModeEnabled: true,
            functionDescription: description);
    }
}

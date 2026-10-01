using OpenAI.Responses;

#pragma warning disable OPENAI001

namespace JobTracker.Api.Services;

public static class InterviewPreparationOutputFormat
{
    public static ResponseTextFormat Create()
    {
        return ResponseTextFormat.CreateJsonSchemaFormat(
            jsonSchemaFormatName: "interview_preparation_advice",
            jsonSchema: BinaryData.FromString("""
                {
                  "type": "object",
                  "properties": {
                    "applicationId": {
                      "type": ["integer", "null"],
                      "description": "Application ID returned by the interview tool, or null when no interview is found."
                    },
                    "summary": {
                      "type": "string"
                    },
                    "preparationPlan": {
                      "type": "array",
                      "items": { "type": "string" }
                    },
                    "practiceQuestions": {
                      "type": "array",
                      "items": { "type": "string" }
                    },
                    "suggestedChecklistItems": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "title": { "type": "string" },
                          "dueDate": {
                            "type": ["string", "null"],
                            "description": "A date in YYYY-MM-DD format, or null when there is no reliable basis for a due date."
                          }
                        },
                        "required": ["title", "dueDate"],
                        "additionalProperties": false
                      }
                    }
                  },
                  "required": [
                    "applicationId",
                    "summary",
                    "preparationPlan",
                    "practiceQuestions",
                    "suggestedChecklistItems"
                  ],
                  "additionalProperties": false
                }
                """),
            jsonSchemaIsStrict: true);
    }
}

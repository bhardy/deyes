import { NextRequest, NextResponse } from "next/server";
import { parsePdfFromUrl } from "@/lib/pdf";
import type { ParseResponse, ParseError } from "@/types/table";

export const maxDuration = 30; // 30 second timeout

export async function POST(request: NextRequest): Promise<NextResponse<ParseResponse>> {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: "INVALID_URL",
            message: "Please provide a PDF URL",
          },
        },
        { status: 400 }
      );
    }

    const result = await parsePdfFromUrl(url);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    // Check if it's our custom ParseError
    if (error && typeof error === "object" && "type" in error && "message" in error) {
      const parseError = error as ParseError;
      const statusCode =
        parseError.type === "INVALID_URL" || parseError.type === "NOT_A_PDF"
          ? 400
          : parseError.type === "FETCH_FAILED"
            ? 502
            : parseError.type === "TOO_LARGE"
              ? 413
              : 422;

      return NextResponse.json(
        {
          success: false,
          error: parseError,
        },
        { status: statusCode }
      );
    }

    // Unknown error
    console.error("Parse error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          type: "PARSE_FAILED",
          message: "An unexpected error occurred while parsing the PDF.",
        },
      },
      { status: 500 }
    );
  }
}

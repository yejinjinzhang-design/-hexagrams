import { NextResponse } from "next/server";
import { computeDivinationResult } from "@/lib/divination";
import { buildLiuyaoBoard } from "@/lib/liuyao-board";
import { analyzeDivination } from "@/lib/llm";
import { saveSession, getSessionById, updateSession } from "@/lib/storage/mock";
import type { Gender, UserQuestionInput } from "@/types/divination";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      user: UserQuestionInput;
      diceSums: number[];
    };

    const { user, diceSums } = body;

    if (!user || !Array.isArray(diceSums) || diceSums.length !== 6) {
      return NextResponse.json(
        { error: "参数错误，需提供 user 与长度为 6 的 diceSums。" },
        { status: 400 }
      );
    }
    const currentYear = new Date().getFullYear();
    const safeBirthYear =
      Number.isInteger(user.birthYear) &&
      user.birthYear >= 1900 &&
      user.birthYear <= currentYear
        ? user.birthYear
        : currentYear;

    const safeQuestion =
      user.question && user.question.trim()
        ? user.question.trim()
        : "（用户未明确填写问题，卦象偏整体趋势参考）";

    const userInput: UserQuestionInput = {
      birthYear: safeBirthYear,
      gender: (user.gender ?? "male") as Gender,
      question: safeQuestion
    };

    const divination = computeDivinationResult(diceSums);
    const date = new Date();
    const board = buildLiuyaoBoard(diceSums, date, divination);

    // 先创建仅包含卦象与排盘的会话，立即返回给前端
    const session = await saveSession({
      userInput,
      divination,
      board,
      provider: undefined,
      model: undefined,
      promptVersion: undefined,
      aiResult: undefined,
      rawText: undefined
    });

    // 在后台异步调用 AI，完成后更新会话中的分析结果
    void analyzeDivination({
      user: userInput,
      divination
    })
      .then((result) =>
        updateSession(session.id, {
          provider: result.model.provider,
          model: result.model.model,
          promptVersion: result.promptVersion,
          aiResult: result.analysis,
          rawText: result.rawText
        })
      )
      .catch((error) => {
        void updateSession(session.id, {
          rawText:
            error instanceof Error
              ? error.message
              : "DeepSeek 分析过程中出现未知错误。"
        });
      });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "分析过程中发生未知错误。"
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json(
      { error: "缺少 sessionId 参数。" },
      { status: 400 }
    );
  }

  const session = await getSessionById(sessionId);

  if (!session) {
    return NextResponse.json(
      { session: null },
      { status: 200 }
    );
  }

  return NextResponse.json({ session });
}


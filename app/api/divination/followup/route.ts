import { NextResponse } from "next/server";
import { getSessionById } from "@/lib/storage/mock";
import { sanitizeAiText } from "@/utils/sanitizeAiText";
import type { YaoLineBoard } from "@/types/liuyao-board";

export const runtime = "nodejs";

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

function getApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    console.error("[followup] Missing DeepSeek API Key (DEEPSEEK_API_KEY)");
    throw new Error("DEEPSEEK_API_KEY 未配置，请在 .env.local 中设置");
  }
  return key;
}

interface FollowupHistoryItem {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sessionId?: string;
      question?: string;
      history?: FollowupHistoryItem[];
    };

    console.log("[followup] raw body:", body);

    const sessionId = body.sessionId;
    const question = (body.question ?? "").trim();
    const history = Array.isArray(body.history) ? body.history : [];

    if (!sessionId) {
      return NextResponse.json(
        {
          text: "未能识别本次占卦会话，请刷新结果页或重新起卦后再问。",
        },
        { status: 400 }
      );
    }

    if (!question) {
      return NextResponse.json(
        { text: "请输入要问的内容后再发送。" },
        { status: 400 }
      );
    }

    const session = await getSessionById(sessionId);

    if (!session || !session.board) {
      console.error("[followup] Session not found for sessionId:", sessionId);
      return NextResponse.json(
        {
          text:
            "本次卦象会话已失效或不在当前服务器上（例如部署多实例、长时间未操作或进程重启）。请重新起卦生成新会话后再追问。",
        },
        { status: 404 }
      );
    }

    const { userInput, board, divination } = session;
    const { benGua, bianGua, meta } = board;

    const lineToText = (line: YaoLineBoard) => {
      const parts: string[] = [];
      parts.push(`第 ${line.index} 爻`);
      if (line.sixGod) parts.push(line.sixGod);
      if (line.liuQin) parts.push(line.liuQin);
      parts.push(`${line.stem}${line.branch}${line.fiveElement}`);
      if (line.shiYing === "世") parts.push("为世");
      if (line.shiYing === "应") parts.push("为应");
      if (line.moving) parts.push("发动");
      if (line.fuShen) {
        parts.push(
          `伏神：${line.fuShen.liuQin}${line.fuShen.stem}${line.fuShen.branch}${line.fuShen.fiveElement}`
        );
      }
      return parts.join("，");
    };

    const benLines = [...benGua.lines]
      .sort((a, b) => b.index - a.index)
      .map(lineToText)
      .join("\n");

    const movingLines = session.divination.movingLines;

    const postAnalysisBlock =
      session.postAnalysisFlatText?.trim() ||
      "（走势分析正文未单独缓存，仍以卦象与用户所问为纲。）";

    const system = `
你是一位擅长六爻解读的东方命理老师傅。
当前用户已经就同一件事起过一卦，并完成了前事验证与事情走势分析。
现在的任务不是重新起卦，而是「卦后追问」：在这一卦不变的前提下，继续围绕此事回答用户的细问。

【重要约束】
只根据这一卦与用户的问题来解读，不可脱离卦象空谈；
不要使用「一定会」「必然」这类绝对语气，可用「多半」「大致」「需警惕」等较为温和的表达；
优先回答用户关心的走向、时机、关系、阻碍、转机与应对之道，而不是空泛安慰。

【说话风格】
语言自然连贯，像与求测者当面细谈；
可以按意思分成几段来讲，但不要使用「一、二、三」之类的小标题或条目列表；
每一个关键判断，都要在话语里点出卦中的依据，而不是只给结论。

【输出格式硬性要求】
输出必须为纯文本，不要使用 markdown、标题符号、加粗符号、列表符号或任何格式化标记。
不要使用 #、**、-、*、1.、2.、3. 等任何 markdown 或编号列表形式。
不要写「### 分析」，不要写「**某卦名**」，不要写以数字或短横线开头的条目。
只输出自然语言段落，可以分段，但每一段都应当是普通的中文句子。
`.trim();

    const baseContext = `
【用户原始问题】
${userInput.question}

【基础信息】
- 出生年份：${userInput.birthYear}
- 性别：${userInput.gender}
- 起卦时间：${meta.solarDate}（农历：${meta.lunarDate}）
- 四柱：${meta.yearPillar} ${meta.monthPillar} ${meta.dayPillar} ${meta.hourPillar}
- 日空：${meta.dayXunKong}

【卦象概要】
- 本卦：${benGua.name}（${benGua.palace}）
- 变卦：${
      bianGua ? `${bianGua.name}（${bianGua.palace}）` : "无变卦"
    }
- 动爻：${
      movingLines.length ? movingLines.join("、") + " 爻动" : "无动爻"
    }
- 世爻位置：第 ${benGua.shiPosition || "（未标）"} 爻
- 应爻位置：第 ${benGua.yingPosition || "（未标）"} 爻

【六爻明细（自上而下）】
${benLines}

【事情走势分析（再断其后）】
${postAnalysisBlock}

【说明】
- 用户此前已经看过此卦的「前事验证」与「事情走势分析」，现在的提问是在此基础上的卦后追问；
- 回答时请与常理与卦象自洽，无需重复整篇前事验证与走势分析，但要保持语气与判断方向前后一致。
`.trim();

    const messages: { role: "system" | "user" | "assistant"; content: string }[] =
      [
        { role: "system", content: system },
        {
          role: "user",
          content: baseContext,
        },
      ];

    if (history.length) {
      messages.push({
        role: "user",
        content:
          "【以下是此前围绕本卦的简短对话记录，可作为参考，但请以当前这一问为主】\n" +
          history
            .map((item, idx) =>
              item.role === "user"
                ? `求测者追问 ${idx + 1}：${item.content}`
                : `前一轮你的回答 ${idx + 1}：${item.content}`
            )
            .join("\n\n"),
      });
    }

    messages.push({
      role: "user",
      content: `【本次卦后追问】\n${question}\n\n请据此卦，围绕这一次的追问给出连贯的一段回答。`,
    });

    const deepseekBody = {
      model: "deepseek-chat",
      messages,
    };

    const divinationDataForLog = {
      userInput,
      meta,
      benGua: {
        name: benGua.name,
        palace: benGua.palace,
        shiPosition: benGua.shiPosition,
        yingPosition: benGua.yingPosition,
      },
      movingLines,
      originalHexagram: divination.originalHexagram,
      changedHexagram: divination.changedHexagram,
      followupQuestion: question,
      historyCount: history.length,
    };

    console.log("==== FOLLOWUP INPUT ====");
    console.log(JSON.stringify(divinationDataForLog, null, 2));

    console.log("==== FOLLOWUP SYSTEM PROMPT ====");
    console.log(system);

    let text = "";

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      console.log("FOLLOWUP DeepSeek URL:", DEEPSEEK_URL);
      console.log("FOLLOWUP DeepSeek model:", deepseekBody.model);

      const res = await fetch(DEEPSEEK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getApiKey()}`,
        },
        body: JSON.stringify(deepseekBody),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const raw = await res.text();

      console.log("==== FOLLOWUP RAW RESPONSE ====");
      console.log(raw);

      if (!res.ok) {
        console.error(
          "[followup] DeepSeek HTTP error:",
          res.status,
          res.statusText,
          raw
        );
        return NextResponse.json({
          text: "卦意未尽显，可稍后再观",
        });
      }

      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        console.error("[followup] Failed to parse DeepSeek JSON:", e);
        return NextResponse.json({
          text: "卦意未尽显，可稍后再观",
        });
      }

      console.log("==== FOLLOWUP PARSED RESPONSE ====");
      console.log(JSON.stringify(parsed, null, 2));

      if (
        !parsed ||
        !Array.isArray(parsed.choices) ||
        !parsed.choices[0] ||
        !parsed.choices[0].message ||
        typeof parsed.choices[0].message.content !== "string"
      ) {
        console.error("[followup] DeepSeek response invalid:", parsed);
        return NextResponse.json({
          text: "卦意未尽显，可稍后再观",
        });
      }

      text = parsed.choices[0].message.content.trim();
    } catch (error) {
      console.error("[followup] DeepSeek ERROR:", error);
      return NextResponse.json({
        text: "卦意未尽显，可稍后再观",
      });
    }

    if (!text) {
      console.error("[followup] empty text from DeepSeek");
      return NextResponse.json({
        text: "卦意未尽显，可稍后再观",
      });
    }

    const cleanText = sanitizeAiText(text);
    return NextResponse.json({ text: cleanText });
  } catch (error) {
    console.error("[followup] Unexpected ERROR:", error);
    return NextResponse.json({
      text: "卦意未尽显，可稍后再观",
    });
  }
}


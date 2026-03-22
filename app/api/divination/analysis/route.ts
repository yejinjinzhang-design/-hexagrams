import { NextResponse } from "next/server";
import { buildPreAnalysisFeedbackSummary } from "@/lib/pre-analysis-feedback";
import { getSessionById } from "@/lib/storage/mock";
import { sanitizeAiText } from "@/utils/sanitizeAiText";
import type { YaoLineBoard } from "@/types/liuyao-board";

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

function getApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    console.error("[analysis] Missing DeepSeek API Key (DEEPSEEK_API_KEY)");
    throw new Error("DEEPSEEK_API_KEY 未配置，请在 .env.local 中设置");
  }
  return key;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { sessionId?: string };
    console.log("ANALYSIS raw body:", body);
    const sessionId = body.sessionId;

    if (!sessionId) {
      return NextResponse.json(
        { text: "卦意未尽显，可稍后再观" },
        { status: 400 }
      );
    }

    const session = await getSessionById(sessionId);

    if (!session || !session.board) {
      console.error("[analysis] Session not found for sessionId:", sessionId);
      return NextResponse.json(
        { text: "卦意未尽显，可稍后再观" },
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

    const preCheckBlock =
      session.preCheckResultText?.trim() ||
      "（前事验证正文未单独缓存，仍以卦象与用户所问为纲。）";

    const feedbackBlockRaw = buildPreAnalysisFeedbackSummary(
      session.preAnalysisFeedback?.messages
    ).trim();
    const feedbackBlock =
      feedbackBlockRaw ||
      session.preAnalysisFeedback?.summary?.trim() ||
      "";

    const system = `
你是一位精通六爻断卦的老师傅。
此刻的任务是在已经大致验过前象之后，细断此卦后势与事态走向。

若用户提供了「对前事验证的补充与修正」且内容非空，须在后续各段分析中切实纳入，不可轻忽；那是为对齐现实而非更换问卜主题，仍须在本卦与原问题框架内参断。

【重要约束】
只根据当前这张卦象与用户的问题来分析，不可脱离卦象空谈；
不要使用「一定会」「必然」这类绝对语气，可用「多半」「大致」「需警惕」等较为温和的表达；
需要兼顾吉凶与可行的应对之道，而不是单纯报喜或报忧。

【说话风格】
语言自然连贯，像在与求测者面对面说话；
可以按逻辑分段展开，但不要用「一、二、三」这类生硬小标题；
每一个重要判断，都要点出卦中的依据，而不是只给结论。

【输出格式硬性要求】
输出必须为纯文本，不要使用 markdown、标题符号、加粗符号、列表符号或任何格式化标记。
不要使用 #、**、-、*、1.、2.、3. 等任何 markdown 或编号列表形式。
不要写「### 分析」，不要写「**某卦名**」，不要写以数字或短横线开头的条目。
只输出自然语言段落，可以分段，但每一段都应当是普通的中文句子。
`.trim();

    const userPrompt = `
【用户问题】
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

【前事验证（先观应象）】
${preCheckBlock}

【用户对前事验证的补充与修正】
${
  feedbackBlock
    ? `以下内容为用户对前事验证结果的补充与修正，并非新的问卜主题。请将其作为本次卦象分析的附加上下文，在后续走势判断、关系判断、阻碍判断与建议中优先纳入考虑，不可忽略。

${feedbackBlock}`
    : "（用户未另作补述，可仅以前验与卦象为准。）"
}

【六爻明细（自上而下）】
${benLines}

【分析重点】
请在前象大致相合的前提下，围绕下列要点展开正式分析：
- 先看用神、世应之旺衰、生克、合冲，说明整件事的主线与自己在其中所处的位置；
- 结合动爻：哪些爻发动，是否化出有利或不利之象（如化回头生、回头克、进退神等），推断事情后续的转折与节奏；
- 说明六亲之间的关系：财、官、兄弟、父母、子孙，对本事的是非得失各自有什么影响；
- 若月建、日辰对用神、世应、动爻有生克冲合，请一并说明对成败轻重、过程顺逆的影响；
- 对于时间层面，可以大致指出「接下来一段时间」是利于推进、适合观望，还是宜先整顿自身、缓步而行。

【请重点回答】
- 从此卦来看，这件事后续发展的总体倾向如何，是「渐进有机」还是「波折较多」；
- 过程中需要特别留心哪些风险位点或关键人物（结合动爻、六亲、六神等说明依据）；
- 若想尽量趋利避害，此刻求测者可以如何布局与应对（给出1-3条具体可行的建议）。

【表达方式要求】
- 用自然、连贯的中文断卦口吻，不要输出 JSON 或代码；
- 不要只写几句宽泛安慰，要在话语中点明「为什么这样看」；
- 末尾用一两句温和收束，例如提醒「卦只是当下一念之象，后事仍需你在现实中谨慎拿捏」。

【可用补充信息】
- 若有帮助，你也可以简单提及本卦与变卦在意象上的对比，说明「从何而来，向何处去」的大致意味。

请据此给出一段完整的正式分析。`.trim();

    const deepseekBody = {
      model: "deepseek-chat",
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
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
    };

    console.log("==== ANALYSIS INPUT ====");
    console.log(JSON.stringify(divinationDataForLog, null, 2));

    console.log("==== ANALYSIS SYSTEM PROMPT ====");
    console.log(system);

    console.log("==== ANALYSIS USER PROMPT ====");
    console.log(userPrompt);

    let text = "";

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      console.log("ANALYSIS DeepSeek URL:", DEEPSEEK_URL);
      console.log("ANALYSIS DeepSeek model:", deepseekBody.model);

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

      console.log("==== ANALYSIS RAW RESPONSE ====");
      console.log(raw);

      if (!res.ok) {
        console.error(
          "[analysis] DeepSeek HTTP error:",
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
        console.error("[analysis] Failed to parse DeepSeek JSON:", e);
        return NextResponse.json({
          text: "卦意未尽显，可稍后再观",
        });
      }

      console.log("==== ANALYSIS PARSED RESPONSE ====");
      console.log(JSON.stringify(parsed, null, 2));

      if (
        !parsed ||
        !Array.isArray(parsed.choices) ||
        !parsed.choices[0] ||
        !parsed.choices[0].message ||
        typeof parsed.choices[0].message.content !== "string"
      ) {
        console.error("[analysis] DeepSeek response invalid:", parsed);
        return NextResponse.json({
          text: "卦意未尽显，可稍后再观",
        });
      }

      text = parsed.choices[0].message.content.trim();
    } catch (error) {
      console.error("[analysis] DeepSeek ERROR:", error);
      return NextResponse.json({
        text: "卦意未尽显，可稍后再观",
      });
    }

    if (!text) {
      console.error("[analysis] empty text from DeepSeek");
      return NextResponse.json({
        text: "卦意未尽显，可稍后再观",
      });
    }

    const cleanText = sanitizeAiText(text);
    return NextResponse.json({ text: cleanText });
  } catch (error) {
    console.error("[analysis] Unexpected ERROR:", error);
    return NextResponse.json({
      text: "卦意未尽显，可稍后再观",
    });
  }
}


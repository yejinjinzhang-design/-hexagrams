import { NextResponse } from "next/server";
import { buildPreAnalysisFeedbackSummary } from "@/lib/pre-analysis-feedback";
import {
  finalizePostAnalysisResult,
  formatPostAnalysisForContext,
  parsePostAnalysisStructuredContent,
} from "@/lib/divination/analysis-structured";
import { LEAD_LAYER_PROSE_STYLE_BLOCK } from "@/lib/divination/lead-layer-prose-style";
import { formatPreCheckForAnalysis } from "@/lib/divination/precheck-structured";
import { getSessionById, updateSession } from "@/lib/storage/mock";
import { sanitizeAiText } from "@/utils/sanitizeAiText";
import type { YaoLineBoard } from "@/types/liuyao-board";
import type { PostAnalysisStructuredResult } from "@/lib/storage/types";

export const runtime = "nodejs";

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
      (session.preCheckResult
        ? formatPreCheckForAnalysis(session.preCheckResult).trim()
        : null) ||
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
此刻是在前象已验之后，细断此卦之后势与走向。

若用户提供了「对前事验证的补充与修正」且内容非空，须在全部分层中切实纳入，不可轻忽；那是为对齐现实而非更换问卜主题，仍须在本卦与原问题框架内参断。

【重要约束】
只根据当前卦象与用户所问来分析，不可脱离卦象空谈；
勿用「一定」「必然」等绝对语气，可用「多半」「大致」「似」「需留意」等克制表述；
吉凶与可行应对须兼顾，勿单面讨好或单面恫吓。

【说话风格】
以现代书面中文为主：清楚、克制、好读；把卦理与后势说明白，而不是仿古文评注或聊天碎嘴。
勿用「第一点、第二点」式编号；JSON 各字段内部也不要 markdown、不要 #、**、列表符号。

${LEAD_LAYER_PROSE_STYLE_BLOCK}

【分层职责（须由 JSON 三字段体现）】
1）summaryText（先陈其势——后势总览，非一两句空泛断语）：须一至两段、信息饱满而语句清楚（全文汉字宜在三百字以上），使用户不读后文亦能把握后势大意七八成；文风必须严格遵守上文【第一折书面语体】：中短句、一句一义、勿整段赋式黏连。优先从整卦、卦名取象、本卦气质、变卦所向、本变合参之人事意味起笔，不必先拘泥某一爻。须自然融贯下列维度之多者（语气连贯、分段清楚即可，勿列「1、2、3」，勿写「总结如下」）：①整体局势先定调（顺、缓、阻、反复、将成未成、可成而迟、眼下难定、外顺内滞等，留分寸）；②当前阶段具体化（起念、筹备、推进、卡住、等待、反复、收口、临门未定等）；③时间节奏（快与慢、近期动静、是否须待某段方更明朗、先缓后明等）；④过程中更可能出现的现实情节（补材料、来回修改、等待批复、流程拖延、先近后搁、差最后一步等），指类不武断；⑤内因与外缘何者偏显；⑥最终趋向（缓成、不速、有机在后段、眼前未稳非无望、强进反偏等），勿铁口。末可一句提醒与实事参证。
2）reasoningText：对应「再释其由」。以清楚现代书面语解释何以得出上一层判断；可综论卦象大意、卦名取象、本卦与变卦之关系、世应人事、动爻变化、月日节候、五行生克等——但不必样样写全，亦不必按固定顺序；择与本卦最相干者书之，使人知其理路；勿仿古文连缀。宜在约一百八十汉字以上。
3）detailedSections：对应「细参卦旨」。须为数组，含 2 至 5 个对象，每个对象有 title（短而稳的四五字内小标题，如「世应与人事」「本变之机」「阻碍所在」，勿生僻）与 content（该标题下一段完整分析，现代书面语、说清楚为主）。小标题须依本卦信息量灵活自拟，不可千篇一律；勿机械规定「必须先动爻再世应再月建」；若卦名、典故、大象、时机、进退、人我之势等最能说明问题，即可单列成节。

【输出格式硬性要求】
只输出一个 JSON 对象，不要代码围栏，不要前后赘语。
键名必须完全一致：summaryText（字符串）、reasoningText（字符串）、detailedSections（数组，元素为 { "title": "…", "content": "…" }）。
不得省略键；detailedSections 长度须在 2～5 之间；各 content 须为完整段落，可换行分段，勿堆砌无释之术语。
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
    ? `以下内容为用户对前事验证结果的补充与修正，并非新的问卜主题。请将其作为本次卦象分析的附加上下文，在走势、关系、阻碍与建议中优先纳入，不可忽略。

${feedbackBlock}`
    : "（用户未另作补述，可仅以前验与卦象为准。）"
}

【六爻明细（自上而下）】
${benLines}

【分析提示（可择用，勿当作死板提纲）】
你可据卦酌取：整体大象与卦名寓意；本卦与变卦「从何而至、向何而去」；世应与人事、主客与进退；动爻所显之变化与关节；月建日辰之助抑；内外因与阻碍、转机；节奏与应期之分寸；典故取象若有助于说清，亦可入文。不必面面俱到，以说清本卦与用户之问为主。

【须覆盖之要旨（散见于各层，勿单列清单给用户）】
后势总体倾向与须警惕之处；趋利避害时可行的应对一二（融入叙述，勿写成操作手册条目）。

【先陈其势（summaryText）专嘱】
此字段不是一句话摘要，而是对整件事后势的「大势总览」：围绕整体局势、当前阶段、时间节奏、可能发生的现实情节、内外因素、最终趋向来写，允许且鼓励从本卦、变卦、卦名、整体取象切入，不必先拆世应动爻。遣词造句须与【第一折书面语体】一致，优先让普通用户一遍读懂。

请输出符合系统说明的 JSON。
`.trim();

    const deepseekBody = {
      model: "deepseek-chat",
      messages: [
        { role: "system" as const, content: system },
        { role: "user" as const, content: userPrompt },
      ],
      ...(process.env.DEEPSEEK_JSON_MODE === "1"
        ? { response_format: { type: "json_object" as const } }
        : {}),
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
      const timeout = setTimeout(() => controller.abort(), 60_000);

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

    const parsedStruct = parsePostAnalysisStructuredContent(text);
    const structured: PostAnalysisStructuredResult = finalizePostAnalysisResult(
      parsedStruct,
      text
    );
    const flatText = formatPostAnalysisForContext(structured);
    const cleanFlat = sanitizeAiText(flatText);

    await updateSession(sessionId, {
      postAnalysisResult: structured,
      postAnalysisFlatText: cleanFlat,
    });

    return NextResponse.json({
      analysis: structured,
      text: cleanFlat,
    });
  } catch (error) {
    console.error("[analysis] Unexpected ERROR:", error);
    return NextResponse.json({
      text: "卦意未尽显，可稍后再观",
    });
  }
}


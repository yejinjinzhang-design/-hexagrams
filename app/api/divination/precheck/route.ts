import { NextResponse } from "next/server";
import { getSessionById, updateSession } from "@/lib/storage/mock";
import { sanitizeAiText } from "@/utils/sanitizeAiText";
import type { YaoLineBoard } from "@/types/liuyao-board";

const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

function getApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    console.error("[precheck] Missing DeepSeek API Key (DEEPSEEK_API_KEY)");
    throw new Error("DEEPSEEK_API_KEY 未配置，请在 .env.local 中设置");
  }
  return key;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { sessionId?: string };
    console.log("PRECHECK raw body:", body);
    const sessionId = body.sessionId;

    if (!sessionId) {
      return NextResponse.json(
        { text: "DEBUG: sessionId missing" },
        { status: 400 }
      );
    }

    const session = await getSessionById(sessionId);

    if (!session || !session.board) {
      console.error("Session not found for sessionId:", sessionId);
      return NextResponse.json(
        { text: "DEBUG: session not found" },
        { status: 404 }
      );
    }

    const { userInput, board } = session;
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

    const system = `
你是一位精通六爻断卦的老师傅。
此刻你的任务不是断结果，而是先观其应，先验前事与当下局面。

【重要约束】
只根据当前这张卦象与用户所问的问题来判断，不可脱离卦象空谈；
不允许预测最终结果，不下「成/不成」之断语；
不可给出模糊安慰，而要结合卦中具体爻位说明缘由。

【说话风格】
语言自然连贯，像在与求测者面对面说话；
不要用「验证点一、验证点二」这类条目式列举；
不要输出 JSON 给用户看，也不要像客服机器人；
每一个重要判断都要「讲为什么」，并点出卦中的依据。

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

【六爻明细（自上而下）】
${benLines}

【你需要优先细看的部分】
1. 先看世爻、应爻：世爻代表求测之人，应爻代表对方或事端的回应；
2. 再看动爻：哪些爻发动、是否牵动世应，判断事情是否已经推进一段时日，而非刚起心念；
3. 看六亲：财、官、兄弟、父母、子孙，各自所临之爻与世应、动爻的生克关系；
4. 看六神：尤其是青龙、白虎、玄武等所临之处，用来说明贵人、阻滞、是非、暗事；
5. 若月建、日辰对用神、世应有生克合冲，也一并纳入考虑。

【前事与当下要回答的问题】
请围绕上面这张卦，先讲「现在」与「至今为止」的情形，而不是未来的结果。
尤其请判断：
- 这件事是不是已经推进了一段时间，而不是刚刚起念；
- 求测者此刻是笃定、自信，还是多有犹豫、心里没底（结合世爻之旺衰、受制情况来讲）；
- 途中是否多有反复、拖延、曲折（可结合动爻、冲合情况）；
- 是否有贵人相助（例如官鬼或用神临青龙、贵人星等），
  也是否同时存在竞争者或掣肘之人（例如兄弟爻发动、与用神相争）；
- 整体看来，此卦是偏顺势，还是阻力偏多。

【表达方式要求】
- 请用自然的断卦口吻，好比：
  「此卦世爻偏弱，说明你眼下对这件事并没有十足把握。
    再看官鬼临青龙，且与世爻有生扶之意，因此这件事背后并非全无助力，反而隐约有贵人之象。
    但兄弟爻亦有动作，所以旁边也并不是没有竞争之人。」
- 不要使用「第一点、第二点」这种列举式小标题；
- 每一个重要判断，都要在话里点出依据，例如：
  「兄弟爻发动，因此旁有竞争之人」、
  「官鬼临青龙，因此有贵人助力之象」、
  「世爻受制，因此你自己并不十分笃定」、
  「动爻与应爻有牵连，因此事情应已推进过，不是空想」。

【禁止做的事】
- 不要预测最终结果，不要说「一定能成 / 一定不成」；
- 不要提前给出完整的未来分析；
- 不要只给空泛安慰或套话。

【输出要求】
- 只返回一段连续的中文自然语言，不要输出 JSON 或代码；
- 末尾请用一句话收束，例如：
  「以上多是此卦先映出的当下之象，你看，是否与你眼下所处之境大致相合？」
  或语气相近的话，用自己的话形容即可。
`.trim();

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
    };

    console.log("==== PRECHECK INPUT ====");
    console.log(JSON.stringify(divinationDataForLog, null, 2));

    console.log("==== SYSTEM PROMPT ====");
    console.log(system);

    console.log("==== USER PROMPT ====");
    console.log(userPrompt);

    let text = "";

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000); // 10 秒超时

      console.log("PRECHECK DeepSeek URL:", DEEPSEEK_URL);
      console.log("PRECHECK DeepSeek model:", deepseekBody.model);
      console.log(
        "PRECHECK DeepSeek messages length:",
        deepseekBody.messages.length
      );

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

      console.log("==== PRECHECK RAW RESPONSE ====");
      console.log(raw);

      if (!res.ok) {
        console.error(
          "[precheck] DeepSeek HTTP error:",
          res.status,
          res.statusText,
          raw
        );
        return NextResponse.json({
          text: "DEBUG: deepseek http error",
        });
      }

      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        console.error("[precheck] Failed to parse DeepSeek JSON:", e);
        return NextResponse.json({
          text: "DEBUG: deepseek json parse failed",
        });
      }

      console.log("==== PRECHECK PARSED RESPONSE ====");
      console.log(JSON.stringify(parsed, null, 2));

      if (
        !parsed ||
        !Array.isArray(parsed.choices) ||
        !parsed.choices[0] ||
        !parsed.choices[0].message ||
        typeof parsed.choices[0].message.content !== "string"
      ) {
        console.error("DeepSeek response invalid:", parsed);
        return NextResponse.json({
          text: "DEBUG: deepseek content missing",
        });
      }

      text = parsed.choices[0].message.content.trim();
    } catch (error) {
      console.error("DeepSeek ERROR:", error);
      return NextResponse.json({
        text: "接口调用失败，请查看后端日志",
      });
    }

    if (!text) {
      console.error("[precheck] empty text from DeepSeek");
      return NextResponse.json({
        text: "DEBUG: deepseek content missing",
      });
    }

    const cleanText = sanitizeAiText(text);
    await updateSession(sessionId, { preCheckResultText: cleanText });
    return NextResponse.json({ text: cleanText });
  } catch (error) {
    console.error("[precheck] handler error:", error);
    return NextResponse.json(
      { text: "DEBUG: handler error" },
      { status: 500 }
    );
  }
}



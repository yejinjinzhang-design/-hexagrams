import { NextResponse } from "next/server";
import { getSessionById, updateSession } from "@/lib/storage/mock";
import {
  classifyPrecheckQuestion,
  formatPrecheckProfileForPrompt,
} from "@/lib/divination/precheck-question-profile";
import { sanitizeAiText } from "@/utils/sanitizeAiText";
import type { YaoLineBoard } from "@/types/liuyao-board";

export const runtime = "nodejs";

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
        { text: "未能识别本次占卦会话，请返回重新起卦。" },
        { status: 400 }
      );
    }

    const session = await getSessionById(sessionId);

    if (!session || !session.board) {
      console.error("Session not found for sessionId:", sessionId);
      return NextResponse.json(
        {
          text:
            "本次卦象会话已失效或不在当前服务器上，请重新起卦后再试。",
        },
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

    const questionProfile = classifyPrecheckQuestion(userInput.question);
    const profileBlock = formatPrecheckProfileForPrompt(questionProfile);

    const system = `
你是一位精通六爻断卦的老师傅。
此刻你的任务不是断结果、不是泛泛概括卦象吉凶，而是：
围绕用户「原问题」先核验与所问之事最直接相关的已发生前情与当下阶段，再观其应在卦中的映现。

【核心目标】
先回答：若求测者此刻所问的正是这件事，那么最值得先核对、先对齐现实的「已发生事实」是什么？
包括：时间感（大约何时起势、何时转折）、阶段感（当下卡在哪一步）、诱因感（更似何种缘由）、行为感（是否已有所行动或等待）。
必须紧扣用户原问题，避免一上来只讲抽象情绪（如「你最近较焦虑」）或空洞运势套话。

【重要约束】
只根据当前这张卦象与用户所问的问题来判断，不可脱离卦象空谈；
不允许预测最终结果，不下「成/不成」之断语；
不可只给模糊安慰，要结合卦中具体爻位说明「为何作此推验」；
语气留有余地，勿说满、勿武断具体日期或铁口直断。

【说话风格】
语言自然连贯，文雅如面谈；
不要用「验证点一、验证点二」这类条目式列举；
不要输出 JSON 给用户看，也不要像客服机器人；
每一个重要判断都要「讲为什么」，并点出卦中的依据。

【叙述顺序（内化于心，勿用标题列出）】
先点出与问题最相关的前情，再补时间脉络，再及诱因与当前阶段，末句收束为：若与实情大体相合，再言后势（不可在此展开未来详断）。

【输出格式硬性要求】
输出必须为纯文本，不要使用 markdown、标题符号、加粗符号、列表符号或任何格式化标记。
不要使用 #、**、-、*、1.、2.、3. 等任何 markdown 或编号列表形式。
不要写「### 分析」，不要写「**某卦名**」，不要写以数字或短横线开头的条目。
只输出自然语言段落，可以分段，但每一段都应当是普通的中文句子。
`.trim();

    const userPrompt = `
【用户问题】
${userInput.question}

${profileBlock}

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

【卦象运用方式】
请在下笔时自觉运用下列读卦要点（融入叙述，不要逐条编号复述给用户）：
先看世爻、应爻（人、事、对方之应）；再看动爻是否牵动世应、示事已非初念；
看六亲与世应、动爻生克；看六神所主（贵人、阻滞、暗昧、口舌等）；
若月建、日辰对用神、世应有生克合冲，可含蓄点破。

【生成步骤（内化执行，勿向用户展示步骤名）】
Step 1：从用户原话中把握核心主题（如求职时机、感情走向、合作能否落地等）。
Step 2：对照上文「本类问题优先核验的前情维度」，选出与这一问最相关的若干条作为主轴。
Step 3：用卦象支撑你对这些前情的推验——先写清「与问题直接相关的前情」，再补整体态势；
避免开篇只有情绪或泛泛论运势。

【表达方式要求】
用自然断卦口吻，将爻象依据织进句子，例如点出世爻旺衰、动爻与世应之牵连、兄弟竞夺、官鬼文书等，
但不要使用「第一点、第二点」式列举。

【禁止做的事】
不要预测最终结果，不要说「一定能成 / 一定不成」；
不要提前给出完整的未来走势分析；
不要只给空泛安慰或套话；
不要脱离用户原问题只复述卦名卦象。

【输出要求】
只返回一段（或数段）连续的中文自然语言，不要输出 JSON 或代码；
末尾用一句话收束，邀请用户核对前情是否相合，并暗示若合则再断其后，例如：
「以上多是此卦先映出的前情与当下之境，你看，是否与你所历大致相合？若大体应得上，再与你细论其后。」
语气可自拟，须含「先核前情、再言后势」之意，勿展开后势细节。
`.trim();

    const deepseekBody = {
      model: "deepseek-chat",
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
    };

    const divinationDataForLog = {
      precheckQuestionKind: questionProfile.kind,
      precheckQuestionLabel: questionProfile.labelZh,
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
          text: "前事验证服务暂时不可用，请稍后重试。",
        });
      }

      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        console.error("[precheck] Failed to parse DeepSeek JSON:", e);
        return NextResponse.json({
          text: "前事验证返回异常，请稍后重试。",
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
          text: "前事验证未返回有效内容，请稍后重试。",
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
        text: "前事验证未返回有效内容，请稍后重试。",
      });
    }

    const cleanText = sanitizeAiText(text);
    await updateSession(sessionId, { preCheckResultText: cleanText });
    return NextResponse.json({ text: cleanText });
  } catch (error) {
    console.error("[precheck] handler error:", error);
    return NextResponse.json(
      { text: "前事验证处理出错，请稍后重试。" },
      { status: 500 }
    );
  }
}



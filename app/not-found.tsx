import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="font-ritual-title text-xl text-[#3e3127]">未找到页面</h1>
      <p className="mt-3 text-sm text-[#8c7a6b]">
        请求的地址不存在或已被移动
      </p>
      <Link
        href="/"
        className="mt-6 inline-block text-sm text-[#b08a57] underline underline-offset-4"
      >
        返回首页
      </Link>
    </div>
  );
}

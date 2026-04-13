import Link from "next/link";
import type { CategoryInfo } from "@/types";

export default function CategoryCard({ category }: { category: CategoryInfo }) {
  return (
    <Link
      href={`/${category.id === "news" ? "news" : category.id}`}
      className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
    >
      <div
        className={`${category.color} text-white rounded-lg w-12 h-12 flex items-center justify-center text-2xl shrink-0`}
      >
        {category.icon}
      </div>
      <div>
        <p className="font-bold text-gray-800">{category.label}</p>
        <p className="text-xs text-gray-500">{category.description}</p>
      </div>
    </Link>
  );
}

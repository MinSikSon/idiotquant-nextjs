"use client"

import { selectArticleList } from "@/lib/features/article/articleSlice"
import { useAppSelector } from "@/lib/hooks"
import { TemplateArticle } from "../templateArticle";

export default function Item({ params: { id } }: { params: { id: number } }) {
    const articleList = useAppSelector(selectArticleList);

    return <TemplateArticle
        title={articleList[id].title}
        subTitle={articleList[id].subTitle}
        link={articleList[id].link}
        detail={articleList[id].detail}
        img={articleList[id].img}
    />
}

export const runtime = 'edge'
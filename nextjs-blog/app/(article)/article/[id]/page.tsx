"use client"

import { selectArticleList, setArticleIndex } from "@/lib/features/article/articleSlice"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { useEffect } from "react";
import { TemplateArticle } from "../templateArticle";

export default function Item({ params: { id } }: { params: { id: number } }) {
    const dispatch = useAppDispatch();
    const articleList = useAppSelector(selectArticleList);

    useEffect(() => {
        dispatch(setArticleIndex(id));
    }, []);

    return <TemplateArticle
        title={articleList[id].title}
        subTitle={articleList[id].subTitle}
        link={articleList[id].link}
        detail={articleList[id].detail}
        img={articleList[id].img}
    />
}
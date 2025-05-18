"use client"

import React from "react";

import { useAppSelector } from "@/lib/hooks";
import { selectArticleList, } from "@/lib/features/article/articleSlice";
import { Web3Card2 } from "@/components/TopCreators2";

export default function ArticlePage() {
    const articleList: any = useAppSelector(selectArticleList);
    console.log(`[ArticlePage] articleList`, articleList);

    return <>
        {!!articleList ? <Web3Card2 title={'Article'} parentRouter={'article'} data={articleList} /> : <></>}
    </>
}
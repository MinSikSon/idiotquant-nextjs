"use client"

import React from "react";
import Link from "next/link";

import { TemplateArticleSimple } from "./templateArticleSimple";
import { useAppSelector } from "@/lib/hooks";
import { selectArticleIndex, selectArticleList, } from "@/lib/features/article/articleSlice";

export default function ArticlePage() {
    const articleIndex = useAppSelector(selectArticleIndex);
    const articleList = useAppSelector(selectArticleList);

    const Article = (props) => {
        const { index, item, articleIndex } = props;

        return <div>
            <Link href={`/article/${index}`}>
                <TemplateArticleSimple
                    title={item.title}
                    subTitle={item.subTitle}
                    link={item.link}
                    img={item.img}
                />
            </Link>
        </div>;

    }

    return (
        <div>
            {articleList.map((item, index) =>
                <Article
                    key={index.toString()}
                    index={index}
                    item={item}
                    articleIndex={articleIndex}
                />
            )}
        </div>
    );
}
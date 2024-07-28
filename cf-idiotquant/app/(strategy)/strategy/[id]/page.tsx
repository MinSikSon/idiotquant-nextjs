"use client"

import { useAppSelector } from "@/lib/hooks"
import { TemplateArticle } from "@/components/templateArticle";
import Stategy from "../page";

export default function Item({ params: { id } }: { params: { id: number } }) {
    // const articleList = useAppSelector(selectArticleList);

    // return <TemplateArticle
    //     title={articleList[id].name}
    //     subTitle={articleList[id].desc}
    //     // link={articleList[id].link}
    //     detail={articleList[id].detail}
    //     img={articleList[id].imgs}
    // />
    return <Stategy />

}

export const runtime = 'edge'
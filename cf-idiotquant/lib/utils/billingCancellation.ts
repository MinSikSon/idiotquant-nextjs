export type CancellationStatus = "pending" | "approved" | "rejected";

export const cancellationLabel: Record<CancellationStatus, string> = {
    pending: "처리 대기",
    approved: "승인",
    rejected: "반려",
};

export type Cancellation = {
    status: CancellationStatus;
    reason: string | null;
    requestedAt: string;
    resolvedAt: string | null;
};

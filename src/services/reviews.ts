/**
 * Reviews service — calls real FastAPI review workflow endpoints.
 */
import { apiGet, apiPost } from "@/lib/api";

export interface ReviewCommentResponse {
  id: string;
  output_id: string;
  review_id?: string;
  author_id: string;
  author?: { id: string; name: string; email: string };
  comment: string;
  created_at: string;
}

export const reviewsService = {
  async submitForReview(outputId: string): Promise<{ message: string; status: string }> {
    return apiPost(`/outputs/${outputId}/submit-review`);
  },

  async approve(outputId: string): Promise<{ message: string; status: string }> {
    return apiPost(`/outputs/${outputId}/approve`);
  },

  async requestChanges(
    outputId: string,
    comment: string
  ): Promise<{ message: string; status: string }> {
    return apiPost(`/outputs/${outputId}/request-changes`, { comment });
  },

  async resubmit(outputId: string): Promise<{ message: string; status: string }> {
    return apiPost(`/outputs/${outputId}/resubmit`);
  },

  async listComments(outputId: string): Promise<ReviewCommentResponse[]> {
    return apiGet<ReviewCommentResponse[]>(`/outputs/${outputId}/comments`);
  },

  async addComment(outputId: string, comment: string): Promise<ReviewCommentResponse> {
    return apiPost<ReviewCommentResponse>(`/outputs/${outputId}/comments`, { comment });
  },

  async listQueue(filterType: "my" | "team" | "completed" = "my") {
    return apiGet(`/reviews?filter_type=${filterType}`);
  },
};

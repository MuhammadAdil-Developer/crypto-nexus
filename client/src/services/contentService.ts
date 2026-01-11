import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export interface SupportResource {
    id: string;
    title: string;
    description: string;
    icon: string;
    link?: string;
    link_text: string;
    resource_type: 'guide' | 'forum' | 'tutorial' | 'other';
    order: number;
}

export interface ForumCategory {
    id: string;
    name: string;
    description: string;
    icon: string;
    order: number;
    post_count: number;
}

class ContentService {
    private getHeaders() {
        const token = localStorage.getItem("accessToken");
        return {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        };
    }

    // Support Resources
    async getResources() {
        try {
            const response = await axios.get(`${API_BASE_URL}/content/resources/`);
            return { success: true, data: response.data };
        } catch (error: any) {
            return { success: false, message: error.response?.data?.detail || "Failed to fetch resources" };
        }
    }

    async createResource(data: Partial<SupportResource>) {
        try {
            const response = await axios.post(`${API_BASE_URL}/content/resources/`, data, { headers: this.getHeaders() });
            return { success: true, data: response.data };
        } catch (error: any) {
            return { success: false, message: error.response?.data?.detail || "Failed to create resource" };
        }
    }

    async updateResource(id: string, data: Partial<SupportResource>) {
        try {
            const response = await axios.put(`${API_BASE_URL}/content/resources/${id}/`, data, { headers: this.getHeaders() });
            return { success: true, data: response.data };
        } catch (error: any) {
            return { success: false, message: error.response?.data?.detail || "Failed to update resource" };
        }
    }

    async deleteResource(id: string) {
        try {
            await axios.delete(`${API_BASE_URL}/content/resources/${id}/`, { headers: this.getHeaders() });
            return { success: true };
        } catch (error: any) {
            return { success: false, message: error.response?.data?.detail || "Failed to delete resource" };
        }
    }

    // Forum Categories
    async getCategories() {
        try {
            const response = await axios.get(`${API_BASE_URL}/content/categories/`);
            return { success: true, data: response.data };
        } catch (error: any) {
            return { success: false, message: error.response?.data?.detail || "Failed to fetch categories" };
        }
    }

    async createCategory(data: Partial<ForumCategory>) {
        try {
            const response = await axios.post(`${API_BASE_URL}/content/categories/`, data, { headers: this.getHeaders() });
            return { success: true, data: response.data };
        } catch (error: any) {
            return { success: false, message: error.response?.data?.detail || "Failed to create category" };
        }
    }

    async updateCategory(id: string, data: Partial<ForumCategory>) {
        try {
            const response = await axios.put(`${API_BASE_URL}/content/categories/${id}/`, data, { headers: this.getHeaders() });
            return { success: true, data: response.data };
        } catch (error: any) {
            return { success: false, message: error.response?.data?.detail || "Failed to update category" };
        }
    }

    async deleteCategory(id: string) {
        try {
            await axios.delete(`${API_BASE_URL}/content/categories/${id}/`, { headers: this.getHeaders() });
            return { success: true };
        } catch (error: any) {
            return { success: false, message: error.response?.data?.detail || "Failed to delete category" };
        }
    }

    // Forum Posts (Moderation)
    async getPosts() {
        try {
            const response = await axios.get(`${API_BASE_URL}/content/posts/`, { headers: this.getHeaders() });
            return { success: true, data: response.data };
        } catch (error: any) {
            return { success: false, message: error.response?.data?.detail || "Failed to fetch posts" };
        }
    }

    async deletePost(id: string) {
        try {
            await axios.delete(`${API_BASE_URL}/content/posts/${id}/`, { headers: this.getHeaders() });
            return { success: true };
        } catch (error: any) {
            return { success: false, message: error.response?.data?.detail || "Failed to delete post" };
        }
    }

    async createPost(data: any) {
        try {
            const response = await axios.post(`${API_BASE_URL}/content/posts/`, data, { headers: this.getHeaders() });
            return { success: true, data: response.data };
        } catch (error: any) {
            return { success: false, message: error.response?.data?.detail || "Failed to create post" };
        }
    }

    async updatePost(id: string, data: any) {
        try {
            const response = await axios.put(`${API_BASE_URL}/content/posts/${id}/`, data, { headers: this.getHeaders() });
            return { success: true, data: response.data };
        } catch (error: any) {
            return { success: false, message: error.response?.data?.detail || "Failed to update post" };
        }
    }
}

export default new ContentService();

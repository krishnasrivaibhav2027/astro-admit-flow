export const api = {
    createResult: async (data: {
        student_id: string;
        subject: string;
        level: string;
        attempts_easy: number;
        attempts_medium: number;
        attempts_hard: number;
    }) => {
        const backendUrl = import.meta.env.VITE_BACKEND_URL;
        const token = localStorage.getItem('firebase_token');

        if (!token) {
            throw new Error("Authentication credential missing");
        }

        const response = await fetch(`${backendUrl}/api/create-result`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || 'Failed to create result');
        }
        return response.json();
    }
};

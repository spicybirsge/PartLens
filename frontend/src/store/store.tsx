'use client'

import { create } from 'zustand'
import vars from '../vars/vars'

interface User {
    id: string
    username: string
    name: string,
    email: string,
    avatarUrl: string,
    createdAt: string,
    updatedAt: string

}

interface UserStore {
    loaded: boolean
    user: User | null

    setUser: (user: User | null) => void
    logout: () => Promise<void>
    checkIfLoggedIn: () => Promise<void>
}

export const userStore = create<UserStore>((set) => ({
    loaded: false,

    user: null,

    setUser: (user) => {
        set({ user })
    },

logout: async () => {
    const token = localStorage.getItem('token')

    if (!token) {
        set({ user: null })
        return
    }

    const URL = vars.BACKEND_URL + '/api/v1/auth/logout'

    try {
        const logoutReq = await fetch(URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        })

        const response = await logoutReq.json()

        if (!logoutReq.ok) {
            throw new Error(response.message || 'Logout failed')
        }

        if (response.success) {
            localStorage.removeItem('token')

            set({
                user: null,
            })
        }
    } catch (error) {
        console.error('Logout error:', error)
    }
},

    checkIfLoggedIn: async () => {
        const token = localStorage.getItem('token')

        if (!token) {
            set({
                user: null,
                loaded: true,
            })
            return
        }

        try {
            const response = await fetch(
                `${vars.BACKEND_URL}/api/v1/auth/me`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            )

            const data = await response.json()

            if (data.success) {
                set({
                    user: data.user,
                    loaded: true,
                })
                return
            }

            set({
                user: null,
                loaded: true,
            })
        } catch (error) {
            console.error('Failed to check authentication:', error)

            set({
                user: null,
                loaded: true,
            })
        }
    },
}))
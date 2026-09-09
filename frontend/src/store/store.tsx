'use client'

import { create } from 'zustand';
import vars from '../vars/vars'

export const userStore = create((set) => ({
    loaded: false,

    user: null,
    setUser: (user) => set({user}),
    
    logout: () => {
       
        set({user: null})
    },

    checkIfLoggedIn: async () => {
        const token = window.localStorage.getItem("token");
        if(!token) {
            set({user:null, loaded: true})
            return;
        }

        const URL = vars.BACKEND_URL+"/api/v1/auth/get-adminaccount"
        try {
        const request = await fetch(URL, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`
            }
        })

        const response = await request.json();
        if(response.success) {
            set({user: response.data, loaded: true})
            return;
        } else {
            set({user:null, loaded:true})
            return;
        }
        } catch(e) {

            throw Error(e)

           
        }
    }



}))
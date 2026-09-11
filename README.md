# Structure
```txt
User
 │
 ├── Sign up / Log in
 │
 └── Profile
      │
      ├── My Machines
      │    │
      │    ├── Machine A
      │    │    ├── 3D Model
      │    │    ├── All Manuals
      │    │    └── Parts
      │    │         ├── Part 001 → Manuals
      │    │         ├── Part 002 → Manuals
      │    │         └── Part 003 → Manuals
      │    │
      │    └── Machine B
      │         └── ...
      │
      └── Bookmarks
           ├── Bookmarked Machines
           └── Bookmarked Manuals

```


# MVP

1. user signup/login with google with session based auth
2. shows a dashboard where u can create machines and upload their `.glb` file, also machine name and machine description will be their in create form. machine can be either public(show in search results or unlisted, wont show in search results). Link to a machine will be generated via nanoid. Also it will contain Page views
3. After that you can upload manual/docs in `.pdf` on how to operate that particular machine part after creation in manage machine page. Every time you upload a pdf it will ask for the part name inside that machine which it refers to, should match what is in the .glb for it to show when that part is clicked, if doesnt exist simply doesnt matter.

`Also: All files are uploaded to imagekit`

4. Basic functions like delete machine deletes it from the system, update details etc
5. Optional low priority: bookmark allows users to bookmark others machines or manuals
6. Search function allows users to search manuals or machines

Functionality basic:
when user visits without signing it default front facing page will be a search with top 10 most viewed public machines
When signed in, it it takes u to the dashboard.


Techstack:
Nextjs, express+postgress with drizzle
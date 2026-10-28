This is a tool I developed for my own use through "vibe coding" to solve the frustration of inserting links into my articles whenever I need to hyperlink keywords to my other posts.

The keyword filters include 0–9, A–Z, and Thai letters. Changing the search text resets the filter to All, including when Favorites is selected.

CSV import replaces all saved keywords with the file's contents. Export a backup first if you want to keep the current list. Use a CSV with `Keyword,URL,Title,Favorite,CreatedAt` headers (`Keyword,URL` is the minimum). Empty or invalid files leave the current list unchanged. Quoted commas, quotes, and multiline fields are supported.

Run the regression tests with `npm test` (Node.js 18 or newer).

<img width="1440" height="900" alt="screenshot" src="https://github.com/user-attachments/assets/e3e2b666-e09e-470a-8c32-dbbe7d3d55d4" />

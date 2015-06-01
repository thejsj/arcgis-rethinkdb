## Questions

1. What is the difference between `nApp` and `app`?
The only difference is the fact that app pushes changes through the socket connection.
2. What does `subscriptionApp.js` do?
Get a feed of images from Instagram and add them to the `instafood` table in RethinkDB.
I don't think you can run this in localhost.
3. How does the `instafood` table get populated?
`instafood` gets populated by running the `subscriptionApp.js` app, which listen 
for new images from Instagram and adds them to the database.
4. What is the original source for the data?
5. How did you generate the data? How did you clean it up?
---
1. The data cleaning seems as interesting as the actual query...
2. 

## Features

1. Add pop-up for showing county name, population, number of restaurants, area, restaurants per area

## TODO

1. Not all counties showing up
2. Add changefeeds in some way

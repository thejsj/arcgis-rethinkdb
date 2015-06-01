
# Queries

## Setup

Create the database in the data explorer. If you're using a shared instance of RethinkDB, name space your database name with your GitHub handle. If you're running these queries locally, you don't need to name space your database name.
```
r.dbCreate('GITHUB_HANDLE_rethinkdb_workshop')
r.db('GITHUB_HANDLE_rethinkdb_workshop').tableCreate('reddit')
```

After that, copy paste this command into the Data explorer. It’s a complicated query, so don’t worry to much about understanding what’s going on.
````
r.db('GITHUB_HANDLE_rethinkdb_workshop').table('reddit').insert(r.http('http://www.reddit.com/r/javascript.json')('data')('children').map(r.row('data').pluck('title', 'num_comments', 'ups', 'downs', 'id', 'score', 'media')))
```
### Running Queries

Here are some queries you can run:
```
// Get all entries over 18
r.db('GITHUB_HANDLE_rethinkdb_workshop').table('reddit').filter({ over_18: true })
// Delete all entries over 18
r.db(‘GITHUB_HANDLE_rethinkdb_workshop’).table('reddit').filter({ over_18: true }).delete()
// Get the sum of all scores
r.db('GITHUB_HANDLE_rethinkdb_workshop').table('reddit').sum('score')
// Get the average of all scores
r.db('GITHUB_HANDLE_rethinkdb_workshop').table('reddit').avg('score')
// Order reddits by number of comments
r.db('GITHUB_HANDLE_rethinkdb_workshop').table('reddit').orderBy('num_comments')
// Order reddicts by number of comments and only get title and num_coments
r.db('GITHUB_HANDLE_rethinkdb_workshop').table('reddit').orderBy('num_comments').pluck('title', 'num_comments')
// Order reddits by number of comments in descending order
r.db('GITHUB_HANDLE_rethinkdb_workshop').table('reddit').orderBy(r.desc('num_comments')).pluck('title', 'num_comments')
// Creating an index
r.db('GITHUB_HANDLE_rethinkdb_workshop').table('reddit').indexCreate('score');
// Get all by score
r.db('GITHUB_HANDLE_rethinkdb_workshop').table('reddit').getAll(0, { index: 'score' });
```

### Using Changefeeds

```
//Get the top three entries
r.db('GITHUB_HANDLE_rethinkdb_workshop').table('reddit').orderBy({ index: r.desc('score') }).limit(3).changes()
// Add the pluck again
r.db('GITHUB_HANDLE_rethinkdb_workshop').table('reddit').orderBy({ index: r.desc('score') }).limit(3).changes()('new_val').pluck('title', 'score')
// In another tab/window update one of the scores to get see the changefeed
r.db('GITHUB_HANDLE_rethinkdb_workshop').table('reddit')(0).update({ score: 9999 })
// Take a look at the changefeed to see the updated score
// To see another update, change the score to 0
r.db('GITHUB_HANDLE_rethinkdb_workshop').table('reddit')(0).update({ score: 0 })
```

## GeoSpatial

First, insert test data

```
// Create Table
r.tableCreate('states');
// Add rows to table
r.table('states')
  .insert(
    r.http('http://eric.clst.org/wupl/Stuff/gz_2010_us_040_00_500k.json')('features')
     .filter(r.row('geometry')('type').ne('MultiPolygon'))
     .map(function (row) {
       return {
        properties: row('properties'),
        location: r.geojson(row('geometry'))
       }
     })
  )
```
Order list of states by distance to San Francisco:
```
r.table('states')
  .orderBy(function (row) {
    return r.point(-122, 37).distance(row('location'));
  })('properties')('NAME')
```

Get all states within 1000 miles from San Francisco

```
r.table('states')
  .filter(function (row) {
    return r.circle([-122, 37], 1000, {unit: 'mi' }).intersects(row('location'));
  })('properties')('NAME')
```

Listen to points getting added within 100 miles of -122,35

```
// Create table
r.tableCreate('points')
// Create Index
r.table('points').indexCreate('location', { geo: true })
// Start listening
r.table('points')
  .changes()
  .filter(function (row) {
    return r.point(-122, 35).distance(row('new_val')('location'), { unit: 'mi' }).lt(100);
  });
// In another tab/window, start adding points..
r.table('points')
  .insert({
    location: r.point(-123.5, 35)
  })
```

## Extra Credit

### Running Queries #2

```
// Get all the entries with media
r.db('GITHUB_HANDLE_rethinkdb_workshop').table('reddit').filter(r.row('media').ne(null)).pluck('media')
// Create the index
r.db('GITHUB_HANDLE_rethinkdb_workshop').table('reddit').indexCreate('superScore', function (row) {
  return row('num_comments').add(row('score')).add(row('ups')).sub(row('downs'))
})
// Query using the index
r.db('GITHUB_HANDLE_rethinkdb_workshop').table('reddit').orderBy({ index: r.desc('superScore') }).pluck('title', 'score')
```

### Query Composition

For query composition, we'll use Python instead of JavaScript.

```python
import rethinkdb as r
conn = r.connect()
reddit = r.db('GITHUB_HANDLE_rethinkdb_workshop').table('reddit')
redditPluck = reddit.pluck('title', 'score')
# Run that query
redditPluck.run(conn)
# Run that query again
redditPluck.run(conn)

# Create a function that builds a query dynamically
def getPluckQuery(properties):
  return reddit.pluck(*properties)
```



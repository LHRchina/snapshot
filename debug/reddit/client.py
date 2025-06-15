import praw

# Replace with your actual credentials
reddit = praw.Reddit(
    client_id="",
    client_secret="",
    user_agent="", # Be descriptive! e.g., "MyRedditScraper by u/YourRedditUsername"
    # If you need to access private data or post, you'll need username and password
    # username="YOUR_REDDIT_USERNAME",
    # password="YOUR_REDDIT_PASSWORD"
)

# Example: Get top posts from a subreddit
subreddit = reddit.subreddit("dubai")
print(f"Display Name: {subreddit.display_name}")

posts_data = []
for post in subreddit.new(limit=20): # 'hot', 'new', 'top', 'controversial', 'rising'
    posts_data.append({
        "title": post.title,
        "score": post.score,
        "num_comments": post.num_comments,
        "url": post.url,
        "selftext": post.selftext,
        "created_utc": post.created_utc
    })

# You can then process posts_data (e.g., save to CSV, DataFrame)
for post in posts_data:
    print(f"Title: {post['title']} | Score: {post['score']}")

# Example: Get comments from a specific post
# submission = reddit.submission(url="https://www.reddit.com/r/IAmA/comments/m8n4vt/im_bill_gates_cochair_of_the_bill_and_melinda/")
# submission.comments.replace_more(limit=None) # To get all comments, not just top level
# for comment in submission.comments.list():
#     print(comment.body)
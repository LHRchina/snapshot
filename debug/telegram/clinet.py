from telethon.sync import TelegramClient
from telethon.tl.types import Channel


# Replace with your actual API ID, API Hash, and phone number
# read from a the config file
api_id = ""
api_hash = ''
phone = '' # Your phone number with country code

# Create a TelegramClient instance
# The 'session_name' will be the file where Telethon stores your session
client = TelegramClient('my_session', api_id, api_hash)

async def scrape_channel(channel_username):
    try:
        await client.start(phone=phone) # Log in if not already authenticated
        print("Client logged in.")

        # Resolve the channel entity
        entity = await client.get_entity(channel_username)

        if isinstance(entity, Channel):
            print(f"Scraping messages from channel: {entity.title} (@{entity.username})")

            messages_data = []
            # Iterate over messages in the channel
            # You can set a limit or a date range
            async for message in client.iter_messages(entity, limit=50): # Get last 50 messages
                message_info = {
                    'id': message.id,
                    'date': message.date,
                    'text': message.text,
                    'views': message.views,
                    'post_url': f"https://t.me/{channel_username}/{message.id}"
                    # You can extract more attributes like media, replies, etc.
                }
                messages_data.append(message_info)
                # print(f"  Message ID: {message.id} - Date: {message.date} - Text: {message.text[:100]}...")

            print(f"Scraped {len(messages_data)} messages.")
            return messages_data

        else:
            print(f"'{channel_username}' is not a public channel or you don't have access.")
            return []

    except Exception as e:
        print(f"An error occurred: {e}")
        return []
    finally:
        await client.disconnect()

if __name__ == '__main__':
    import asyncio
    # Example: Scrape a public channel (e.g., Telegram's official news channel)
    # For private channels, you must be a member, and you'd use its ID or invited link
    target_channel_username = 'dubaionline' # Or a channel ID like -1001234567890

    # Run the async function
    messages = asyncio.run(scrape_channel(target_channel_username))

    # Process your scraped messages
    for msg in messages:
        print(f"ID: {msg['id']}, Date: {msg['date']}, Text: {msg['text'][:100]}...")
        print(f"  URL: {msg['post_url']}")
        print("-" * 30)

    # You can save 'messages' to a CSV, JSON, or database
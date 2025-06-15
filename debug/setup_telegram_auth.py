#!/usr/bin/env python3
"""
Telegram Authentication Setup Script
This script helps set up the initial Telegram session for the news-to-audio integration.
"""

import asyncio
import os
import sys
from telethon import TelegramClient

async def setup_telegram_auth():
    """
    Set up Telegram authentication session
    """
    # Default credentials (can be overridden via command line)
    api_id = ''
    api_hash = ''
    phone = ''

    # Check for command line arguments
    if len(sys.argv) >= 4:
        api_id = sys.argv[1]
        api_hash = sys.argv[2]
        phone = sys.argv[3]
    elif len(sys.argv) >= 2:
        phone = sys.argv[1]

    print(f"Setting up Telegram authentication...")
    print(f"API ID: {api_id}")
    print(f"Phone: {phone}")

    # Create session file in the same directory as this script
    session_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'news_session')

    try:
        # Create client
        client = TelegramClient(session_path, api_id, api_hash)

        print("\nStarting authentication process...")
        print("You will receive a code on your Telegram app.")

        # Start the client with phone number
        await client.start(phone=phone)

        # Test the connection
        me = await client.get_me()
        print(f"\n✅ Authentication successful!")
        print(f"Logged in as: {me.first_name} {me.last_name or ''} (@{me.username or 'no username'})")
        print(f"Session saved to: {session_path}.session")

        # Test channel access
        print("\nTesting channel access...")
        try:
            entity = await client.get_entity('dubaionline')
            print(f"✅ Successfully accessed @dubaionline channel")
        except Exception as e:
            print(f"⚠️  Warning: Could not access @dubaionline channel: {e}")
            print("   Make sure the channel exists and is public")

        await client.disconnect()
        print("\n🎉 Setup complete! You can now use Telegram integration in news-to-audio.js")

    except Exception as e:
        print(f"\n❌ Error during authentication: {e}")
        print("\nTroubleshooting:")
        print("1. Make sure your API credentials are correct")
        print("2. Check your phone number format (include country code)")
        print("3. Ensure you have access to the Telegram app on your phone")
        sys.exit(1)

if __name__ == '__main__':
    print("Telegram Authentication Setup for News-to-Audio")
    print("=" * 50)

    if len(sys.argv) > 1 and sys.argv[1] in ['-h', '--help']:
        print("Usage:")
        print(f"  python3 {sys.argv[0]} [phone_number]")
        print(f"  python3 {sys.argv[0]} [api_id] [api_hash] [phone_number]")
        print("\nExamples:")
        print(f"  python3 {sys.argv[0]} +1234567890")
        print(f"  python3 {sys.argv[0]} 12345 abcdef123456 +1234567890")
        print("\nIf no arguments provided, default values from config will be used.")
        sys.exit(0)

    try:
        asyncio.run(setup_telegram_auth())
    except KeyboardInterrupt:
        print("\n\n❌ Authentication cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)
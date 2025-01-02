import discogs_client
import utils
import utils.logger
import webbrowser
import random
import json
import os
from enum import Enum
import sys


class UserInput(Enum):
    KEEP = 1
    REMOVE = 2
    QUIT = 3


MAXIMUM = 10

USERNAME = "Taeke"

# These keys should be kept secret!
USE_PERSONAL_ACCESS_TOKEN = False
HISTORY_FILE = "history.json"
SECRETS_FILE = "secrets.json"

# A unique user-agent is required with Discogs API requests.
user_agent = "clean-my-wantlist/0.1"

logger = utils.logger.get_logger()


def release_to_string(release: discogs_client.Release) -> str:
    release_string = ""
    release_string += f" - title: {release.title}\n"
    release_string += f" - id: {release.id}\n"
    release_string += f" - artists: {", ".join([artist.name for artist in release.artists])}\n"
    release_string += f" - year: {release.year}\n"
    release_string += f" - styles: {(', '.join(release.styles) if release.styles else "None")}\n"
    release_string += f" - genres: {(', '.join(release.genres) if release.genres else "None")}\n"
    release_string += f" - url {release.url}\n"  # TODO: fetching url is slow?
    return release_string


class WantListManager:
    def __init__(self, user: discogs_client.User):
        self.user = user
        self.wantlist: list[discogs_client.WantlistItem] = []
        self.history = {}

    def fetch_wantlist(self):
        # todo: store copy of wantlist locally such that it does not need to be fetched each time
        self.user.fetch("wants")

        maximum = min(self.user.num_wantlist, MAXIMUM)

        for item in self.user.wantlist:
            self.wantlist.append(item)
            logger.info(f"Fetched {len(self.wantlist)}/{maximum} wanted items")

            if len(self.wantlist) >= MAXIMUM:
                logger.info("Maximum reached")
                break

        random.shuffle(self.wantlist)

    def fetch_release_info(self):
        number_of_wantlist = len(self.wantlist)

        # todo: fetch release info in a separate thread
        for i, item in enumerate(self.wantlist):
            release_to_string(item.release)  # this is just used to fetch relevant fields
            logger.info(f"Fetched info for {i + 1}/{number_of_wantlist} releases")

    def refine_releases(self):
        index = 0
        while index < len(self.wantlist):
            item = self.wantlist[index]

            if item.release.id in self.history:
                logger.info(f"Already checked {item.release.id}")
                index += 1
                continue

            webbrowser.open(item.release.url, new=0, autoraise=False)

            user_input = self.get_user_input(index)

            if user_input == UserInput.QUIT:
                return
            if user_input == UserInput.KEEP:
                self.history[item.release.id] = {"removed": False}  # not needed if data is fetched each time
                index += 1
                continue
            if user_input == UserInput.REMOVE:
                self.history[item.release.id] = {"removed": True}  # not needed if data is fetched each time
                self.delete(index)
            else:
                raise Exception("Unsuported user input!")

    def load_history(self):
        self.history = {}  # reset

        if not os.path.isfile(HISTORY_FILE):
            return

        with open(HISTORY_FILE, "r") as file:
            try:
                self.history = json.load(file)
            except Exception as e:
                logger.warning(f"Failed to load history: caught the following exception {e}")
                return

        logger.info(f"Successfully loaded history containing {len(self.history)} items to {HISTORY_FILE}")

    def save_history(self):
        # Serializing json
        json_object = json.dumps(self.history, indent=4)

        # Writing to sample.json
        with open(HISTORY_FILE, "w") as outfile:
            outfile.write(json_object)

        logger.info(f"Successfully saved history to {HISTORY_FILE}")

    def get_user_input(self, index):
        item = self.wantlist[index]
        release_string = release_to_string(item.release)

        while True:
            response = input(
                f"Release {index}/{len(self.wantlist)} on your wantlist:\n{release_string}\nDo you want to keep this on your want list? y/n/q: "
            )

            if response.lower() == "y":
                return UserInput.KEEP
            elif response.lower() == "n":
                return UserInput.REMOVE
            elif response.lower() == "q":
                return UserInput.QUIT

    def delete(self, index):
        item = self.wantlist[index]
        release_string = release_to_string(item.release)
        logger.warning(f"Removing the following from wantlist: {release_string}")

        try:
            item.delete()
        except Exception as e:
            logger.warning(
                f"Failed to remove item from wantlist, caught the following exception:\n\n {e}\nIt was likely removed manually!"
            )

        self.wantlist.pop(index)


def login_personal_access_token(user_token):
    client = discogs_client.Client(user_agent, token=user_token)
    user_dict = {"username": USERNAME}
    user = discogs_client.User(client, user_dict)
    return client, user


def login_oauth(consumer_key, consumer_secret):
    client = discogs_client.Client(user_agent)
    client.set_consumer_key(consumer_key, consumer_secret)
    token, secret, url = client.get_authorize_url()

    webbrowser.open(url, new=0, autoraise=False)

    # Enter the verifier key that was provided at the unqiue URL
    oauth_verifier = input(f"Enter the verifier key that was provided after authorizing me: ")

    try:
        access_token, access_secret = client.get_access_token(oauth_verifier)
    except discogs_client.exceptions.HTTPError:
        logger.error("Unable to authenticate.")
        sys.exit(1)

    user = client.identity()
    return client, user


def load_secrets():
    if not os.path.isfile(SECRETS_FILE):
        raise Exception(f"The secrets file {SECRETS_FILE} does not exist!")

    with open(SECRETS_FILE, "r") as file:
        try:
            secrets = json.load(file)
        except Exception as e:
            raise Exception(f"Failed to load secrets from {SECRETS_FILE}: {e}")

    user_token = secrets.get("user_token")
    if user_token is None:
        raise Exception(f"The secrets file {SECRETS_FILE} does not contain a user token")

    consumer_key = secrets.get("consumer_key")
    if user_token is None:
        raise Exception(f"The secrets file {SECRETS_FILE} does not contain a consumer key")

    consumer_secret = secrets.get("consumer_secret")
    if user_token is None:
        raise Exception(f"The secrets file {SECRETS_FILE} does not contain a consumer secret")

    logger.info(f"Successfully loaded secrets from {SECRETS_FILE}")
    return user_token, consumer_key, consumer_secret


def main():
    user_token, consumer_key, consumer_secret = load_secrets()

    if USE_PERSONAL_ACCESS_TOKEN:
        _, user = login_personal_access_token(user_token)
    else:
        _, user = login_oauth(consumer_key, consumer_secret)

    want_list_manager = WantListManager(user)
    want_list_manager.load_history()
    want_list_manager.fetch_wantlist()

    # todo: refine masters
    try:
        want_list_manager.refine_releases()
    except Exception as e:
        logger.warning(f"Failed to refine wantlist releases. Caught the following exception: {e}")

    want_list_manager.save_history()


if __name__ == "__main__":
    main()

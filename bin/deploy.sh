SOURCE_DIR="$1"
BUILD_ID="$2"
SSH_USER="$3"
SSH_HOST="$4"

if [ -z "$SOURCE_DIR" ]
then
    echo "No source directory specified"
    exit 1
fi

if [ -z "$BUILD_ID" ]
then
    echo "No build ID specified"
    exit 1
fi

if [ -z "$SSH_USER" ]
then
    echo "No SSH user specified"
    exit 1
fi

if [ -z "$SSH_HOST" ]
then
    echo "No SSH host specified"
    exit 1
fi

echo "rsync'ing to host"
rsync -r --delete-after --quiet "$SOURCE_DIR" $SSH_USER@$SSH_HOST:/var/www/html/releases/$BUILD_ID

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

target_dir=/var/www/html/releases/$BUILD_ID
echo "rsync'ing to host"
rsync -aq --delete-after --rsync-path="mkdir -p $target_dir && rsync" "$SOURCE_DIR" $SSH_USER@$SSH_HOST:$target_dir

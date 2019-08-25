set -e

SOURCE_DIR="$1"
BUILD_NUMBER="$2"
SSH_USER="$3"
SSH_HOST="$4"

if [ -z "$SOURCE_DIR" ]
then
    echo "No source directory specified"
    exit 1
fi

if [ -z "$BUILD_NUMBER" ]
then
    echo "No build number specified"
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

html_dir=/var/www/html
target_dir=$html_dir/releases/$BUILD_NUMBER
echo "rsync'ing to host"
# Purposely leaving trailing slash on the source directory so that the contents get copied
rsync -aq --delete-after --rsync-path="mkdir -p $target_dir/ && rsync" "$SOURCE_DIR" $SSH_USER@$SSH_HOST:$target_dir/

echo "Creating symlinks and swapping"
ssh $SSH_USER@$SSH_HOST /bin/bash <<EOF
ln -snf $(readlink $html_dir/current) $html_dir/previous
ln -snf $target_dir $html_dir/current
EOF

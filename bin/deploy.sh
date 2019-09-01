set -e

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

html_dir=/var/www/html
target_dir=$html_dir/releases/$BUILD_ID
echo "rsync'ing to host"
# Purposely leaving trailing slash on the source directory so that the contents get copied
rsync -aq --delete-after --rsync-path="mkdir -p $target_dir/ && rsync" "$SOURCE_DIR/" $SSH_USER@$SSH_HOST:$target_dir/

echo "Creating symlinks and swapping"
ssh $SSH_USER@$SSH_HOST /bin/bash <<EOF
cp -vrf $html_dir/.env $target_dir/.env
sudo chown -R 1000:48 $target_dir/resources
sudo chown -R 1000:48 $target_dir/tmp
sudo chmod -R 755 $target_dir/resources
sudo chmod -R 755 $target_dir/tmp
php $target_dir/aphiria compile:docs
sudo chown -R 48:48 $target_dir/resources
sudo chown -R 48:48 $target_dir/tmp
ln -snf $(readlink $html_dir/current) $html_dir/previous
ln -snf $target_dir $html_dir/current
EOF

echo "Creating symlinks and swapping"
ssh $SSH_USER@$SSH_HOST /bin/bash <<EOF
ln -snf $(readlink $html_dir/current) $html_dir/previous
ln -snf $target_dir $html_dir/current
EOF

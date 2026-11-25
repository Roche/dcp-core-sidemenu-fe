timeout 200 npm run ngbuild

if [ ! -d "./dist" ]
then
  # npm run ngbuild failed and doesnt produce /dist folder
  echo "npm run build failed"
  exit 1
fi

echo "npm run ngbuild timeout, continue to next step"
exit 0

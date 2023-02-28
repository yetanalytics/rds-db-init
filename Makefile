.phony: clean

clean:
	rm -rf node_modules rds-db-init.zip

node_modules:
	npm install

rds-db-init.zip: node_modules
	zip -r rds-db-init.zip .
